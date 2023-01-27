import lodash from "lodash";
import React, { memo, useCallback, useEffect, useReducer, useRef } from "react";
import { getExtensionBookmarkFolder } from "../utils/chrome";
import { sleep } from "../utils/data";
import { BookmarkTable } from "./BookmarkTable";
import { Footer } from "./Footer";
import { BookmarkGroup, GroupName, TabInfo, TabStorage } from "./shared";
import { TabTable } from "./TabTable";

type TabGroup = {
  tabs: TabInfo[];
  tabGroup?: chrome.tabGroups.TabGroup;
  groupId: number;
};

async function getBookmarkFolders(): Promise<BookmarkGroup[]> {
  const parentFolder = await getExtensionBookmarkFolder();
  const groups: BookmarkGroup[] = [];
  for (const child of parentFolder.children ?? []) {
    if (child.children) {
      groups.push({
        id: child.id ?? "unknown",
        parent: child,
        bookmarks: child.children.filter((c) => c.url !== undefined),
        title: child.title,
        path: [child.title],
      });
    }
  }
  return groups;
}

function sortMapByKey<K, V>(map: Map<K, V>) {
  const sortedArray: Array<[K, V]> = Array.from(map).sort((a, b) => {
    if (a[0] > b[0]) return 1;
    if (a[0] < b[0]) return -1;
    return 0;
  });
  return new Map<K, V>(sortedArray);
}

function groupTabs(tabGroups: chrome.tabGroups.TabGroup[], tabs: TabInfo[]): Map<number, TabGroup> {
  const groups = new Map<number, TabGroup>();
  for (const tab of tabs) {
    const groupId = tab.groupId ?? -1;
    const tabGroup = groups.get(groupId) ?? { tabs: [], groupId };
    groups.set(groupId, tabGroup);
    tabGroup.tabs.push(tab);
  }
  for (const tabGroup of tabGroups) {
    const tg = groups.get(tabGroup.id);
    if (tg !== undefined) {
      tg.tabGroup = tabGroup;
    }
  }
  return sortMapByKey(groups);
}

function getGroupNames(
  tabGroups: chrome.tabGroups.TabGroup[],
  bookmarkFolders: chrome.bookmarks.BookmarkTreeNode[],
): GroupName[] {
  const groupNames: GroupName[] = [];
  for (const group of tabGroups) {
    groupNames.push(GroupName.fromString(group.title ?? ""));
  }
  for (const folder of bookmarkFolders) {
    groupNames.push(GroupName.fromString(folder.title));
  }
  return groupNames;
}

interface ActiveTabData {
  activeTab: number;
  url: string;
}

const MemoTabTable = memo(TabTable);
const MemoBookmarkTable = memo(BookmarkTable);

export const NewTab: React.FC = () => {
  const tabs = useRef<TabInfo[]>([]);
  const tabGroupsRaw = useRef<chrome.tabGroups.TabGroup[]>([]);
  const bookmarkFolders = useRef<BookmarkGroup[]>([]);
  const activeTab = useRef<ActiveTabData>({ activeTab: -1, url: "" });

  useEffect(() => {
    updateTabs();
    chrome.tabs.onCreated.addListener(updateTabs);
    chrome.tabs.onUpdated.addListener(updateTabs);
    chrome.tabs.onRemoved.addListener(updateTabs);
    chrome.tabs.onReplaced.addListener(updateTabs);
    chrome.tabs.onActivated.addListener(updateTabs);
    chrome.tabs.onHighlighted.addListener(updateTabs);
    chrome.tabs.onMoved.addListener(updateTabs);
    chrome.tabs.onAttached.addListener(updateTabs);
    chrome.tabs.onDetached.addListener(updateTabs);
    return () => {
      chrome.tabs.onCreated.removeListener(updateTabs);
      chrome.tabs.onUpdated.removeListener(updateTabs);
      chrome.tabs.onRemoved.removeListener(updateTabs);
      chrome.tabs.onReplaced.removeListener(updateTabs);
      chrome.tabs.onActivated.removeListener(updateTabs);
      chrome.tabs.onHighlighted.removeListener(updateTabs);
      chrome.tabs.onMoved.removeListener(updateTabs);
      chrome.tabs.onAttached.removeListener(updateTabs);
      chrome.tabs.onDetached.removeListener(updateTabs);
    };
  }, []);

  useEffect(() => {
    updateTabGroups();
    chrome.tabGroups.onCreated.addListener(updateTabGroups);
    chrome.tabGroups.onUpdated.addListener(updateTabGroups);
    chrome.tabGroups.onRemoved.addListener(updateTabGroups);
    chrome.tabGroups.onMoved.addListener(updateTabGroups);
    return () => {
      chrome.tabGroups.onCreated.removeListener(updateTabGroups);
      chrome.tabGroups.onUpdated.removeListener(updateTabGroups);
      chrome.tabGroups.onRemoved.removeListener(updateTabGroups);
      chrome.tabGroups.onMoved.removeListener(updateTabGroups);
    };
  }, []);

  useEffect(() => {
    updateBookmarks();
    chrome.bookmarks.onRemoved.addListener(updateBookmarks);
    chrome.bookmarks.onImportEnded.addListener(updateBookmarks);
    chrome.bookmarks.onImportBegan.addListener(updateBookmarks);
    chrome.bookmarks.onChanged.addListener(updateBookmarks);
    chrome.bookmarks.onMoved.addListener(updateBookmarks);
    chrome.bookmarks.onCreated.addListener(updateBookmarks);
    chrome.bookmarks.onChildrenReordered.addListener(updateBookmarks);
    return () => {
      chrome.bookmarks.onRemoved.removeListener(updateBookmarks);
      chrome.bookmarks.onImportEnded.removeListener(updateBookmarks);
      chrome.bookmarks.onImportBegan.removeListener(updateBookmarks);
      chrome.bookmarks.onChanged.removeListener(updateBookmarks);
      chrome.bookmarks.onMoved.removeListener(updateBookmarks);
      chrome.bookmarks.onCreated.removeListener(updateBookmarks);
      chrome.bookmarks.onChildrenReordered.removeListener(updateBookmarks);
    };
  }, []);

  const updateTabs = async () => {
    const newTabs = await chrome.tabs.query({});
    for (const tab of newTabs) {
      if (tab.active) {
        await updateActiveTab({ activeTab: tab.id ?? -1, url: tab.url ?? "" });
      }
    }
    const tabStorages: Map<number, TabStorage> = new Map();
    for (const tab of newTabs) {
      const tabId = tab.id;
      if (tabId !== undefined && tabId >= 0) {
        tabStorages.set(tabId, await TabStorage.fromStorage(chrome.storage.session, tabId));
      }
    }
    const tabInfo: TabInfo[] = [];
    for (const tab of newTabs) {
      tabInfo.push({
        title: tab.title,
        url: tab.url,
        windowId: tab.windowId,
        active: tab.active,
        id: tab.id,
        audible: tab.audible,
        mutedInfo: tab.mutedInfo,
        groupId: tab.groupId,
        lastActive: tabStorages.get(tab.id ?? -1)?.lastActive,
        favIconUrl: tab.favIconUrl,
      });
    }
    tabs.current = tabInfo;
    setTabGroups(groupTabs(tabGroupsRaw.current, tabs.current));
  };

  const updateTabGroups = async () => {
    const tabGroups = await chrome.tabGroups.query({});
    tabGroupsRaw.current = tabGroups;
    setTabGroups(groupTabs(tabGroups, tabs.current));
    setGroupNames(getGroupNames(tabGroupsRaw.current, bookmarkFolders.current));
  };

  const updateBookmarks = async () => {
    // const bookmarkTreeRaw = await chrome.bookmarks.getTree();
    // const bookmarkGroups = walkBookmarkTree(bookmarkTreeRaw);
    // bookmarkFolders.current = [...bookmarkGroups.values()].map((g) => g.parent);
    bookmarkFolders.current = await getBookmarkFolders();
    setBookmarkGroups(bookmarkFolders.current);
    setGroupNames(getGroupNames(tabGroupsRaw.current, bookmarkFolders.current));
  };

  const refresh = useCallback(async () => {
    await sleep(500);
    await updateTabs();
    await updateTabGroups();
    await updateBookmarks();
  }, []);

  const [tabGroups, setTabGroups] = useReducer(
    (oldTabGroups: Map<number, TabGroup>, newTabGroups: Map<number, TabGroup>) => {
      for (const [key, value] of newTabGroups) {
        const oldValue = oldTabGroups.get(key);
        if (oldValue !== undefined && lodash.isEqual(oldValue, value)) {
          newTabGroups.set(key, oldValue);
        }
      }
      return newTabGroups;
    },
    new Map(),
  );

  const [bookmarkGroups, setBookmarkGroups] = useReducer(
    (oldBookmarkGroups: Map<string, BookmarkGroup>, latestBookmarkGroups: BookmarkGroup[]) => {
      const newBookmarkGroups = new Map();
      for (const group of latestBookmarkGroups) {
        const oldValue = oldBookmarkGroups.get(group.id);
        if (oldValue !== undefined && lodash.isEqual(oldValue, group)) {
          newBookmarkGroups.set(group.id, oldValue);
        } else {
          newBookmarkGroups.set(group.id, group);
        }
      }
      return newBookmarkGroups;
    },
    new Map<string, BookmarkGroup>(),
  );

  const [groupNames, setGroupNames] = useReducer((oldGroupNames: GroupName[], newGroupNames: GroupName[]) => {
    if (lodash.isEqual(oldGroupNames, newGroupNames)) {
      return oldGroupNames;
    }
    return newGroupNames;
  }, []);

  // stores last active tab id
  const updateActiveTab = async (curActiveTab: ActiveTabData) => {
    const lastActiveTab = activeTab.current;
    if (lastActiveTab.activeTab === curActiveTab.activeTab) {
      return;
    }
    if (lastActiveTab.activeTab !== -1) {
      await TabStorage.update(chrome.storage.session, {
        tabId: lastActiveTab.activeTab,
        lastActive: new Date().getTime(),
      });
    }
    activeTab.current = curActiveTab;
  };

  return (
    <div className="grid h-full grid-cols-1 p-4 bg-gray-200 justify-items-center gap-y-4 bg-topography">
      <div className="flex flex-col gap-y-4">
        {[...tabGroups.entries()].map(([groupId, group]) => {
          return (
            <MemoTabTable
              key={groupId}
              tabGroup={group.tabGroup}
              tabs={group.tabs}
              groupNames={groupNames}
              refresh={refresh}
            />
          );
        })}
      </div>
      <div className="flex flex-col gap-y-4">
        {[...bookmarkGroups.entries()].map(([groupId, group]) => (
          <MemoBookmarkTable
            key={groupId}
            parent={group.parent}
            bookmarks={group.bookmarks}
            groupNames={groupNames}
            refresh={refresh}
          />
        ))}
      </div>
      <Footer bookmarkGroups={[...bookmarkGroups.values()]} groupNames={groupNames} refresh={refresh} />
    </div>
  );
};
