export type GroupOption =
  | { type: "tabGroup"; value: chrome.tabGroups.TabGroup }
  | { type: "bookmarkFolder"; value: chrome.bookmarks.BookmarkTreeNode };
