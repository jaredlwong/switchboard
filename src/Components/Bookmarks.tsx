import React, { useEffect, useReducer, useState } from "react";
import { BookmarkTable } from "./BookmarkTable";
import { GroupName, TabInfo, TabStorage } from "./shared";
import { TabTable } from "./TabTable";

type BookmarkGroup = {
  id: string;
  parent: chrome.bookmarks.BookmarkTreeNode;
  bookmarks: chrome.bookmarks.BookmarkTreeNode[];
  title: string;
  path: string[];
};

type TabGroup = {
  tabs: TabInfo[];
  tabGroup?: chrome.tabGroups.TabGroup;
  groupId: number;
};

function walkBookmarkTree(root: chrome.bookmarks.BookmarkTreeNode[]): Map<string, BookmarkGroup> {
  const groups = new Map<string, BookmarkGroup>();
  const recurse = (previousPath: string[], node: chrome.bookmarks.BookmarkTreeNode) => {
    const curPath = [...previousPath, node.title];
    const curGroup: BookmarkGroup = {
      id: node.id ?? "unknown",
      parent: node,
      bookmarks: [],
      title: node.title,
      path: curPath,
    };
    groups.set(curGroup.id, curGroup);
    for (const child of node.children ?? []) {
      if (child.url) {
        curGroup.bookmarks.push(child);
      } else {
        recurse(curPath, child);
      }
    }
    if (curGroup.bookmarks.length === 0) {
      groups.delete(curGroup.id);
    }
  };
  for (const bookmark of root) {
    recurse([], bookmark);
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
}

export const Bookmarks: React.FC = () => {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [tabGroupsRaw, setTabGroupsRaw] = useState<chrome.tabGroups.TabGroup[]>([]);
  const [bookmarkTree, setBookmarkTree] = useState<chrome.bookmarks.BookmarkTreeNode[]>([]);

  // const [tabGroups, setTabGroups] = useState<Map<number, TabGroup>>(new Map());
  // const [bookmarkGroups, setBookmarkGroups] = useState<Map<string, BookmarkGroup>>(new Map());
  // const [groupNames, setGroupNames] = useState<GroupName[]>([]);

  function reducer(oldActiveTabId: number, action: { newActiveTabId: number; url: string }): number {
    if (oldActiveTabId !== action.newActiveTabId) {
      if (oldActiveTabId !== -1) {
        console.log(
          "updating local storage",
          JSON.stringify({
            tabId: oldActiveTabId,
            lastActive: new Date().getTime(),
          }),
        );
        // async
        TabStorage.update(chrome.storage.session, {
          tabId: oldActiveTabId,
          lastActive: new Date().getTime(),
        });
      }
      console.log(`new active tab '${action.newActiveTabId}' '${action.url}'`);
      return action.newActiveTabId;
    }
    return oldActiveTabId;
  }

  // stores last active tab id
  const [activeTabs, setActiveTabs] = useReducer(reducer, -1);

  const updateTabs = async () => {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.active) {
        setActiveTabs({ newActiveTabId: tab.id ?? -1, url: tab.url ?? "" });
      }
    }
    const tabStorages: Map<number, TabStorage> = new Map();
    for (const tab of tabs) {
      const tabId = tab.id;
      if (tabId !== undefined && tabId >= 0) {
        tabStorages.set(tabId, await TabStorage.fromStorage(chrome.storage.session, tabId));
      }
    }
    const tabInfo: TabInfo[] = [];
    for (const tab of tabs) {
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
      });
    }
    setTabs(tabInfo);
  };

  // const updateTabs = debounce(updateTabsRaw, 500);
  const updateTabGroups = () => chrome.tabGroups.query({}, setTabGroupsRaw);
  // const updateTabGroups = debounce(updateTabGroupsRaw, 500);
  const updateBookmarks = () => chrome.bookmarks.getTree(setBookmarkTree);
  // const updateBookmarks = debounce(updateBookmarksRaw, 500);

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

  const tabGroups = groupTabs(tabGroupsRaw, tabs);
  const bookmarkGroups = walkBookmarkTree(bookmarkTree);
  const groupNames = getGroupNames(
    tabGroupsRaw,
    [...bookmarkGroups.values()].map((g) => g.parent),
  );

  return (
    <div className="grid grid-cols-1 p-4 bg-gray-200 place-items-center gap-y-4 bg-topography">
      <div className="flex flex-col gap-y-4">
        {[...tabGroups.entries()].map(([groupId, group]) => {
          return <TabTable key={groupId} tabGroup={group.tabGroup} tabs={group.tabs} groupNames={groupNames} />;
        })}
      </div>
      <div className="flex flex-col gap-y-4">
        {[...bookmarkGroups.entries()].map(([groupId, group]) => (
          <BookmarkTable key={groupId} parent={group.parent} bookmarks={group.bookmarks} groupNames={groupNames} />
        ))}
      </div>
    </div>
  );
};
