import { TabInfo } from "../components/shared";
import { filterUndefined, sleep } from "./data";

export function closeTabs(tabs: TabInfo[]) {
  const ids = filterUndefined(tabs.map((tab) => tab.id));
  const removePromises = ids.map((id) =>
    chrome.tabs.remove(id).catch((error) => {
      console.error(`Removing id ${id} failed: ${error}`);
      return error;
    }),
  );
  return Promise.allSettled(removePromises);
}

export async function focusOnTab(tab: TabInfo) {
  const id = tab.id;
  if (id === undefined) {
    return;
  }
  await chrome.tabs.update(id, { active: true });
}

export async function closeTab(tab: TabInfo) {
  const id = tab.id;
  if (id === undefined) {
    return;
  }
  await chrome.tabs.remove(id);
}

async function getBookmarkFolder(path: string[]): Promise<chrome.bookmarks.BookmarkTreeNode | undefined> {
  async function bookmarkFolderHelper(
    i: number,
    node: chrome.bookmarks.BookmarkTreeNode,
  ): Promise<chrome.bookmarks.BookmarkTreeNode | undefined> {
    for (const child of node.children ?? []) {
      if (child.title === path[i]) {
        if (i === path.length - 1) {
          return child;
        }
        return await bookmarkFolderHelper(i + 1, child);
      }
    }
    return undefined;
  }
  const root = await chrome.bookmarks.getTree();
  return await bookmarkFolderHelper(0, root[0]);
}

async function getExtensionBookmarkFolder(): Promise<chrome.bookmarks.BookmarkTreeNode> {
  const folder = await getBookmarkFolder(["Other Bookmarks"]);
  if (folder === undefined) {
    throw new Error("Could not find Other Bookmarks folder");
  }
  return folder;
}

/**
 * This function searches for a subfolder with a given name in a given folder, and returns the
 * subfolder if it exists.
 * If the subfolder does not exist, it creates a new subfolder with the given name in the given
 * folder and returns it.
 *
 * @param folder - The parent folder where the subfolder is located or will be created
 * @param folderName - The name of the subfolder to be returned
 * @returns The subfolder with the given name
 */
async function getSubfolder(
  folder: chrome.bookmarks.BookmarkTreeNode,
  folderName: string,
): Promise<chrome.bookmarks.BookmarkTreeNode> {
  for (const child of folder.children ?? []) {
    if (child.title === folderName) {
      return child;
    }
  }
  return await chrome.bookmarks.create({ parentId: folder.id, title: folderName });
}

/**
 * This function searches for a folder with a given name in a the extension folder, and returns a
 * folder with the exact same name if it exists.
 * If the folder does not exist, it creates a new folder with the given name in the given folder and
 * returns it.
 *
 * @param folderName - The name of the folder to be returned
 * @returns The folder with the given name
 */
export async function getExtensionBookmarkSubfolder(folderName: string): Promise<chrome.bookmarks.BookmarkTreeNode> {
  return await getSubfolder(await getExtensionBookmarkFolder(), folderName);
}

export async function saveTabsToFolder(folderName: string, tabs: TabInfo[]) {
  const extensionFolder = await getExtensionBookmarkFolder();
  const subfolder = await getSubfolder(extensionFolder, folderName);
  const existingBookmarkUrls = new Set<string>();
  for (const child of subfolder.children ?? []) {
    existingBookmarkUrls.add(child.url ?? "");
  }
  for (const tab of tabs) {
    if (!existingBookmarkUrls.has(tab.url ?? "")) {
      await chrome.bookmarks.create({ parentId: subfolder.id, title: tab.title, url: tab.url });
    }
  }
}

/**
 * This function creates tabs for the given bookmarks and moves them to an existing or new tab group
 * with the given name.
 *
 * @param tabGroupName - The name of the tab group. If a tab group with this name already exists,
 * the tabs will be moved to it. Otherwise, a new tab group with this name will be created.
 * @param bookmarks - The bookmarks to be moved to the tab group.
 */
export async function moveBookmarksToTabGroup(tabGroupName: string, bookmarks: chrome.bookmarks.BookmarkTreeNode[]) {
  const promises = bookmarks.map((bookmark) =>
    chrome.tabs
      .create({
        active: false,
        url: bookmark.url,
      })
      .catch((e) => {
        console.error(`Error creating tab for bookmark ${bookmark.id}: ${e}`);
        return undefined;
      }),
  );
  const tabs: TabInfo[] = filterUndefined(await Promise.all(promises));
  const existingTabGroups = await chrome.tabGroups.query({ title: tabGroupName });

  // if existing tabgroup with same name exists, put them there
  const filtered = existingTabGroups.filter((group) => group.title === tabGroupName);
  const existingGroupId = filtered.length > 0 ? filtered[0].id : undefined;
  await chrome.tabs.group({
    groupId: existingGroupId,
    tabIds: filterUndefined(tabs.map((tab) => tab.id)),
  });

  // otherwise create new tab group
  const newGroupId = await chrome.tabs.group({
    groupId: existingGroupId,
    tabIds: filterUndefined(tabs.map((tab) => tab.id)),
  });
  if (existingGroupId === undefined) {
    console.log(`Creating new tab group ${tabGroupName} with id ${newGroupId}...`);
    await sleep(500);
    await chrome.tabGroups.update(newGroupId, { title: tabGroupName });
  }
}

export async function moveBookmarksToFolder(folderName: string, bookmarks: chrome.bookmarks.BookmarkTreeNode[]) {
  const folder = await getExtensionBookmarkSubfolder(folderName);
  const promises = bookmarks.map((bookmark) =>
    chrome.bookmarks.move(bookmark.id, { parentId: folder.id }).catch((error) => {
      console.error(`Moving bookmark ${bookmark.id} failed: ${error}`);
      return error;
    }),
  );
  return Promise.allSettled(promises);
}

export async function openBookmarksInTabGroup(
  tabGroup: chrome.tabGroups.TabGroup,
  bookmarks: chrome.bookmarks.BookmarkTreeNode[],
) {
  const promises = bookmarks.map((bookmark) =>
    chrome.tabs
      .create({
        active: false,
        url: bookmark.url,
      })
      .catch((e) => {
        console.error(`Error creating tab for bookmark ${bookmark.id}: ${e}`);
        return undefined;
      }),
  );
  try {
    const results = await Promise.allSettled(promises);
    const tabIds: number[] = [];
    results.map((tab) => {
      if (tab.status === "fulfilled" && tab.value?.id !== undefined) {
        tabIds.push(tab.value?.id);
      }
    });
    await chrome.tabs.group({ groupId: tabGroup.id, tabIds });
  } catch (e) {
    console.error(`Error creating tabs for bookmarks: ${e}`);
  }
}

export async function saveTabsToBookmarkFolder(folderName: string, tabs: TabInfo[]) {
  const folder = await getExtensionBookmarkSubfolder(folderName);
  const existingBookmarkUrls = new Set<string>();
  for (const child of folder.children ?? []) {
    existingBookmarkUrls.add(child.url ?? "");
  }
  const promises = tabs
    .map((tab) => ({ url: tab.url, title: tab.title }))
    .filter(({ url, title }) => url !== undefined && title !== undefined)
    .filter(({ url }) => !existingBookmarkUrls.has(url!))
    .map(({ url, title }) => chrome.bookmarks.create({ parentId: folder.id, title, url }));
  return Promise.allSettled(promises);
}

export async function saveTabsToBookmarkTree(node: chrome.bookmarks.BookmarkTreeNode, tabs: TabInfo[]) {
  const existingBookmarkUrls = new Set<string>();
  for (const child of node.children ?? []) {
    existingBookmarkUrls.add(child.url ?? "");
  }
  for (const tab of tabs) {
    if (!existingBookmarkUrls.has(tab.url ?? "")) {
      await chrome.bookmarks.create({ parentId: node.id, title: tab.title, url: tab.url });
    }
  }
}

export async function muteTab(tab: TabInfo) {
  const id = tab.id;
  if (id === undefined) {
    return;
  }
  await chrome.tabs.update(id, { muted: true });
}

export async function muteTabs(tab: TabInfo[]) {
  for (const t of tab) {
    await muteTab(t);
  }
}

export async function unmuteTab(tab: TabInfo) {
  const id = tab.id;
  if (id === undefined) {
    return;
  }
  await chrome.tabs.update(id, { muted: false });
}

export async function deleteBookmarks(bookmarks: chrome.bookmarks.BookmarkTreeNode[]): Promise<void> {
  const promises = bookmarks.map((bookmark) => {
    return chrome.bookmarks.remove(bookmark.id ?? "").catch((e) => {
      console.error(`Error deleting bookmark ${bookmark.id}: ${e}`);
    });
  });
  await Promise.all(promises);
}

/**
 * This function adds a list of tabs to a tab group with a given name.
 * If the group does not exist, it creates a new group with the given name and adds the tabs to it.
 * If the group already exists, it adds the tabs to the existing group.
 *
 * @param groupName - The name of the tab group where the tabs will be added
 * @param tabs - The tabs to be added to the group
 */
export async function addTabsToGroup(groupName: string, tabs: TabInfo[]) {
  const existingTabGroups = await chrome.tabGroups.query({ title: groupName });
  const filtered = existingTabGroups.filter((group) => group.title === groupName);
  if (filtered.length === 0) {
    await moveTabsToNewGroup(groupName, tabs);
  } else {
    await addTabsToExistingGroup(filtered[0], tabs);
  }
}

export async function addTabsToExistingGroup(tabGroup: chrome.tabGroups.TabGroup, tabs: TabInfo[]) {
  await chrome.tabs.group({
    groupId: tabGroup.id,
    tabIds: filterUndefined(tabs.map((tab) => tab.id)),
  });
}

export async function moveTabsToNewGroup(groupName: string, tabs: TabInfo[]) {
  const groupId = await chrome.tabs.group({
    tabIds: filterUndefined(tabs.map((tab) => tab.id)),
  });
  await sleep(500);
  await chrome.tabGroups.update(groupId, { title: groupName });
}

export async function createTabGroup(groupName: string, urls: string[]) {
  const promises = urls.map((url) =>
    chrome.tabs
      .create({
        active: false,
        url: url,
      })
      .catch((e) => {
        console.error(`Error creating tab for ${url}: ${e}`);
        return undefined;
      }),
  );
  const tabs: TabInfo[] = filterUndefined(await Promise.all(promises));
  moveTabsToNewGroup(groupName, tabs);
}

export async function changeTabGroupName(groupId: number, newName: string) {
  await chrome.tabGroups.update(groupId, { title: newName });
}

export async function changeBookmarkFolderName(folder: chrome.bookmarks.BookmarkTreeNode, newName: string) {
  // don't rename the root folder or the bookmark bar or other bookmarks
  if (folder.id && Number(folder.id) > 2) {
    await chrome.bookmarks.update(folder.id, { title: newName });
  }
}
