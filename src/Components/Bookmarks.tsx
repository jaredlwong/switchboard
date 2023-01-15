import React, { useEffect, useState } from "react";
import { BookmarkTable } from "./BookmarkTable";
import { GroupOption, TabTable } from "./TabTable";

type BookmarkGroup = {
  id: string;
  parent: chrome.bookmarks.BookmarkTreeNode;
  bookmarks: chrome.bookmarks.BookmarkTreeNode[];
  title: string;
  path: string[];
};

type TabGroup = {
  tabs: chrome.tabs.Tab[];
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

function groupTabs(tabGroups: chrome.tabGroups.TabGroup[], tabs: chrome.tabs.Tab[]): Map<number, TabGroup> {
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

export const Bookmarks: React.FC = () => {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [tabGroupsRaw, setTabGroupsRaw] = useState<chrome.tabGroups.TabGroup[]>([]);
  const [bookmarkTree, setBookmarkTree] = useState<chrome.bookmarks.BookmarkTreeNode[]>([]);

  const [tabGroups, setTabGroups] = useState<Map<number, TabGroup>>(new Map());
  const [bookmarkGroups, setBookmarkGroups] = useState<Map<string, BookmarkGroup>>(new Map());

  const updateTabs = () => chrome.tabs.query({}, setTabs);
  const updateTabGroups = () => chrome.tabGroups.query({}, setTabGroupsRaw);
  const updateBookmarks = () => chrome.bookmarks.getTree(setBookmarkTree);

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

  useEffect(() => {
    setTabGroups(groupTabs(tabGroupsRaw, tabs));
  }, [tabs, tabGroupsRaw]);

  useEffect(() => {
    setBookmarkGroups(walkBookmarkTree(bookmarkTree));
  }, [bookmarkTree]);

  return (
    <div className="grid grid-cols-1 p-4 bg-gray-200 place-items-center gap-y-4">
      <div className="flex flex-col gap-y-4">
        {[...tabGroups.entries()].map(([groupId, group]) => {
          const groupOptions: GroupOption[] = [];
          for (const [_, group] of tabGroups) {
            if (group.tabGroup !== undefined) {
              groupOptions.push({ type: "tabGroup", value: group.tabGroup });
            }
          }
          for (const [_, group] of bookmarkGroups) {
            if (group.parent !== undefined) {
              groupOptions.push({ type: "bookmarkFolder", value: group.parent });
            }
          }
          return (
            <TabTable tabGroup={group.tabGroup} tabs={group.tabs} groupOptions={groupOptions} />
            // <TabGroupXXX groupName={group.tabGroup?.title ?? "Ungrouped"} tabs={group.tabs} onUpdate={() => updateTabs} />
          );
        })}
      </div>
      <div className="flex flex-col gap-y-4">
        {[...bookmarkGroups.entries()].map(([groupId, group]) => (
          <BookmarkTable parent={group.parent} bookmarks={group.bookmarks} />
        ))}
      </div>
    </div>
  );
};
