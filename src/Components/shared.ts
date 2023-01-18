import { extractLeadingEmoji, stripLeadingEmoji } from "../utils/data";

export type GroupOption =
  | { type: "tabGroup"; value: chrome.tabGroups.TabGroup }
  | { type: "bookmarkFolder"; value: chrome.bookmarks.BookmarkTreeNode };

export class GroupName {
  constructor(public readonly emoji: string, public readonly text: string) {}

  static fromString(fullText: string): GroupName {
    const emoji = extractLeadingEmoji(fullText) || "";
    const textName = stripLeadingEmoji(fullText) || "";
    return new GroupName(emoji, textName);
  }

  static merge(options: { oldName?: string; newText?: string; newEmoji?: string }): GroupName {
    const oldName = options.oldName ? GroupName.fromString(options.oldName) : new GroupName("", "");
    return new GroupName(options.newEmoji ?? oldName.emoji, options.newText ?? oldName.text);
  }

  withEmoji(emoji: string): GroupName {
    return new GroupName(emoji, this.text);
  }

  withText(text: string): GroupName {
    return new GroupName(this.emoji, text);
  }

  toString(): string {
    return [this.emoji, this.text].filter((x) => x).join(" ");
  }
}

export class TabStorage {
  constructor(public readonly tabId: number, public readonly createdAt: number, readonly lastActive: number) {}

  static empty(): TabStorage {
    return new TabStorage(-1, -1, -1);
  }

  static fromTab(tab: chrome.tabs.Tab): TabStorage {
    if (tab.active) {
      return new TabStorage(tab.id ?? -1, Date.now(), Date.now());
    }
    return new TabStorage(tab.id ?? -1, Date.now(), -1);
  }

  static fromDict(dict: { tabId?: number; createdAt?: number; lastActive?: number }): TabStorage {
    return new TabStorage(dict.tabId ?? -1, dict.createdAt ?? -1, dict.lastActive ?? -1);
  }

  static async fromStorage(storage: chrome.storage.StorageArea, tabId: number): Promise<TabStorage> {
    if (tabId === -1) {
      return TabStorage.empty();
    }
    const key = `tab=${tabId}`;
    const data = await storage.get(key);
    return TabStorage.fromDict(data[key] ?? {});
  }

  static async update(
    storage: chrome.storage.StorageArea,
    updates: { tabId: number; createdAt?: number; lastActive?: number },
  ): Promise<TabStorage | undefined> {
    if (updates.tabId === -1) {
      return;
    }
    const key = `tab=${updates.tabId}`;
    const cur = await this.fromStorage(storage, updates.tabId);
    const val = new TabStorage(updates.tabId, updates.createdAt ?? cur.createdAt, updates.lastActive ?? cur.lastActive);
    await storage.set({
      [key]: val,
    });
    return val;
  }
}

/**
 * This is a simplified version of the Tab type from chrome.tabs.Tab used to render the TabTable
 */
export type TabInfo = Pick<
  chrome.tabs.Tab,
  "title" | "url" | "windowId" | "active" | "id" | "audible" | "mutedInfo" | "groupId"
> & {
  lastActive?: number;
};

// export interface TabInfo {
//   title?: string | undefined;
//   url?: string | undefined;
//   windowId: number;
//   active: boolean;
//   id?: number | undefined;
//   audible?: boolean | undefined;
//   mutedInfo?: chrome.tabs.MutedInfo | undefined;
//   groupId: number;
//   lastActive?: number;
// }
