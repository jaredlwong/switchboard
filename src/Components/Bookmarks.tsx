import { css, cx } from "@linaria/core";
import { styled } from "@linaria/react";
import { IconSquareX } from "@tabler/icons";
import React, { useEffect, useState } from "react";
import { BookmarkTable } from "./BookmarkTable";

type BookmarkGroup = {
  id: string;
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

async function saveTabsToFolder(tabGroup: TabGroup) {
  let folderId: string | undefined;
  // Check if a bookmark folder with the given name already exists
  const folderName = tabGroup.tabGroup?.title ?? "Ungrouped";
  const searchResults = await chrome.bookmarks.search({ title: folderName });
  if (searchResults.length === 0) {
    // Create a new bookmark folder if it doesn't exist
    const newFolder = await chrome.bookmarks.create({ title: folderName });
    console.log("new folder");
    folderId = newFolder.id;
  } else {
    // If the folder already exists, use its ID
    folderId = searchResults[0].id;
    console.log(`existing folder ${searchResults}`);
  }
  console.log(`saving tab group ${folderName} ${folderId}`);

  // Save each tab as a bookmark into the folder
  for (const tab of tabGroup.tabs) {
    await chrome.bookmarks.create({ parentId: folderId, title: tab.title, url: tab.url });
  }
}

async function saveAndCloseTabGroup(tabGroup: TabGroup) {
  await saveTabsToFolder(tabGroup);
  const tabIds = tabGroup.tabs.map((tab) => tab.id).filter((id) => id !== undefined) as number[];
  await chrome.tabs.remove(tabIds);
}

async function createTabGroup(groupName: string, bookmarks: chrome.bookmarks.BookmarkTreeNode[]) {
  const tabs: chrome.tabs.Tab[] = [];
  for (const bookmark of bookmarks) {
    tabs.push(
      await chrome.tabs.create({
        active: false,
        url: bookmark.url,
      }),
    );
  }
  const groupId = await chrome.tabs.group({
    tabIds: tabs.map((tab) => tab.id).flatMap((e) => (e === undefined ? [] : [e])),
  });
  await chrome.tabGroups.update(groupId, { collapsed: false, title: groupName });
}

async function deleteBookmarks(group: BookmarkGroup) {
  const bookmarkIds = group.bookmarks.map((bookmark) => bookmark.id).flatMap((e) => (e === undefined ? [] : [e]));
  for (const id of bookmarkIds) {
    await chrome.bookmarks.remove(id);
  }
  const children = await chrome.bookmarks.getSubTree(group.id);
  if (children.length === 0) {
    await chrome.bookmarks.remove(group.id);
  }
}

async function closeTab(tab: chrome.tabs.Tab): Promise<void> {
  const id = tab.id;
  if (id !== undefined) {
    await chrome.tabs.remove(id);
  }
}

const FaviconImage = styled.img`
  /* width: 16px;
  height: 16px; */
  display: inline-block;
  margin: 0 4px;
`;

// const BookmarkLink = styled.a`
const fixedWidthNoScrollbar = css`
  // text-overflow: ellipsis;
  // white-space: nowrap;
  display: inline-block;
  white-space: nowrap;
  overflow: scroll;

  // hide scroll bars
  -ms-overflow-style: none; /* Internet Explorer 10+ */
  scrollbar-width: none; /* Firefox */
  ::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
  }
`;

export const TabTable: React.FC<{ group: TabGroup }> = ({ group }) => {
  return (
    <div className="grid grid-cols-12">
      {group.tabs.map((tab) => (
        <>
          <div key={`title-${tab.id}`} className={cx("col-span-9", fixedWidthNoScrollbar)}>
            <a
              href={tab.url}
              target="_blank"
              rel="noreferrer"
              className={css`
                display: inline-block;
              `}
            >
              <FaviconImage src={tab.favIconUrl} className="h-4" />
              {tab.title}
            </a>
          </div>
          <div key={`link-${tab.id}`} className={cx("col-span-2", fixedWidthNoScrollbar)}>
            {tab.url}
          </div>
          <div key={`close-${tab.id}`} className="col-span-1 h-4">
            <button onClick={() => closeTab(tab)}>
              <IconSquareX />
            </button>
          </div>
        </>
      ))}
    </div>
  );
};

function getFaviconUrl(url: string): string {
  const urlObj = new URL(url);
  return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`;
  // http://www.google.com/profiles/c/favicons?domain=targetsite.com
}

export const BookmarkTable2: React.FC<{ group: BookmarkGroup }> = ({ group }) => {
  return (
    <div className="grid grid-cols-12">
      {group.bookmarks.map((bookmark) => (
        <>
          <div key={`title-${bookmark.id}`} className={cx("col-span-9", fixedWidthNoScrollbar)}>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noreferrer"
              className={css`
                display: inline-block;
              `}
            >
              <FaviconImage src={getFaviconUrl(bookmark.url ?? "")} />
              {bookmark.title}
            </a>
          </div>
          <div key={`link-${bookmark.id}`} className={cx("col-span-2", fixedWidthNoScrollbar)}>
            {bookmark.url}
          </div>
        </>
      ))}
    </div>
  );
};

export const Bookmarks: React.FC = () => {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [tabGroupsRaw, setTabGroupsRaw] = useState<chrome.tabGroups.TabGroup[]>([]);
  const [bookmarkTree, setBookmarkTree] = useState<chrome.bookmarks.BookmarkTreeNode[]>([]);

  const [tabGroups, setTabGroups] = useState<Map<number, TabGroup>>(new Map());
  const [bookmarkGroups, setBookmarkGroups] = useState<Map<string, BookmarkGroup>>(new Map());

  useEffect(() => {
    const updateTabs = () => chrome.tabs.query({}, setTabs);
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
    const updateTabGroups = () => chrome.tabGroups.query({}, setTabGroupsRaw);
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
    const updateBookmarks = () => chrome.bookmarks.getTree(setBookmarkTree);
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
    <div className="bg-gray-200 grid place-items-center">
      <div className="flex flex-col min-w-200 w-full lg:max-w-screen-lg">
        {/* <TabGroupTableCombined tabGroupInit={tabGroups} /> */}
        {[...tabGroups.entries()].map(([groupId, group]) => (
          <div key={groupId} className="rounded-md p-2 m-2 border border-gray-300 bg-white">
            <div className="flex">
              <div className="flex-1 justify-start">
                <h1 className="text-base">{group.tabGroup?.title ?? "Ungrouped"}</h1>
              </div>
              <div className="justify-end">
                <div>
                  <button
                    className="text-base bg-blue-500 hover:bg-blue-600 focus:bg-blue-700 active:bg-blue-800 text-white rounded-md px-2"
                    onClick={() => saveAndCloseTabGroup(group)}
                  >
                    Bookmark
                  </button>
                </div>
              </div>
            </div>
            <TabTable group={group} />
            {/* <TabGroupTableDense tabs={group.tabs.map((tab) => ({ tab }))} /> */}
          </div>
        ))}
      </div>
      <div className="flex flex-col min-w-200 w-full lg:max-w-screen-lg">
        {[...bookmarkGroups.entries()].map(([i, group]) => (
          <div key={i} className="rounded-md p-2 m-2 border border-gray-300 bg-white">
            <div className="flex">
              <div className="flex-1 justify-start">
                <h1 className="text-base">{group.path.join(" > ")}</h1>
              </div>
              <div className="justify-end">
                <button
                  className="mx-2 text-base bg-blue-500 hover:bg-blue-600 focus:bg-blue-700 active:bg-blue-800 text-white rounded-md px-2"
                  onClick={() => createTabGroup(group.title, group.bookmarks)}
                >
                  Create Tab Group
                </button>
                <button
                  className="mx-2 text-base bg-blue-500 hover:bg-blue-600 focus:bg-blue-700 active:bg-blue-800 text-white rounded-md px-2"
                  onClick={() => deleteBookmarks(group)}
                >
                  Delete Bookmarks
                </button>
              </div>
            </div>
            <BookmarkTable2 group={group} />
            {/* <BookmarkTable path={group.path ?? []} bookmarks={group.bookmarks} /> */}
          </div>
        ))}
      </div>
    </div>
  );
};
