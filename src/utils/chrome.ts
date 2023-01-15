export function closeTabs(tabs: chrome.tabs.Tab[]) {
  const ids = filterUndefined(tabs.map((tab) => tab.id));
  const removePromises = ids.map((id) =>
    chrome.tabs.remove(id).catch((error) => {
      console.error(`Removing id ${id} failed: ${error}`);
      return error;
    }),
  );
  return Promise.allSettled(removePromises);
}

export async function focusOnTab(tab: chrome.tabs.Tab) {
  const id = tab.id;
  if (id === undefined) {
    return;
  }
  await chrome.tabs.update(id, { active: true });
}

export async function closeTab(tab: chrome.tabs.Tab) {
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

export async function saveTabsToFolder(folderName: string, tabs: chrome.tabs.Tab[]) {
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

export async function saveTabsToBookmarkTree(node: chrome.bookmarks.BookmarkTreeNode, tabs: chrome.tabs.Tab[]) {
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

export async function muteTab(tab: chrome.tabs.Tab) {
  const id = tab.id;
  if (id === undefined) {
    return;
  }
  await chrome.tabs.update(id, { muted: true });
}

export async function muteTabs(tab: chrome.tabs.Tab[]) {
  for (const t of tab) {
    await muteTab(t);
  }
}

export async function unmuteTab(tab: chrome.tabs.Tab) {
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

function filterUndefined<T>(arr: (T | undefined)[]): T[] {
  const filtered: T[] = [];
  for (const e of arr) {
    if (e !== undefined) {
      filtered.push(e);
    }
  }
  return filtered;
}

export async function addTabsToExistingGroup(tabGroup: chrome.tabGroups.TabGroup, tabs: chrome.tabs.Tab[]) {
  await chrome.tabs.group({
    groupId: tabGroup.id,
    tabIds: filterUndefined(tabs.map((tab) => tab.id)),
  });
}

export async function createTabGroup(groupName: string, bookmarks: chrome.bookmarks.BookmarkTreeNode[]) {
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
  const tabs: chrome.tabs.Tab[] = filterUndefined(await Promise.all(promises));
  const groupId = await chrome.tabs.group({
    tabIds: tabs.map((tab) => tab.id).flatMap((e) => (e === undefined ? [] : [e])),
  });
  await chrome.tabGroups.update(groupId, { collapsed: false, title: groupName });
}

export async function changeTabGroupName(group: chrome.tabGroups.TabGroup, newName: string) {
  await chrome.tabGroups.update(group.id, { title: newName });
}
