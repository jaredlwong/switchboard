import { ArrowsPointingInIcon, BookmarkSquareIcon, FolderPlusIcon } from "@heroicons/react/24/outline";
import React, { ChangeEvent, useId, useRef } from "react";
import {
  deleteBookmarks,
  moveBookmarksToFolder,
  openLinksInTabGroup,
  saveLinksToBookmarkFolder,
} from "../utils/chrome";
import { Link } from "../utils/data";
import { BookmarkGroup, GroupName } from "./shared";

interface Props {
  groupNames: GroupName[];
  refresh: () => Promise<void>;
  bookmarkGroups: BookmarkGroup[];
}

export const Footer: React.FC<Props> = ({ groupNames, refresh, bookmarkGroups }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const selectedGroupName = useRef<GroupName | undefined>(undefined);

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "";
      textAreaRef.current.style.height = `${e.target.scrollHeight}px`;
    }
  };

  const getLinks = (): Link[] => {
    if (textAreaRef.current === null) {
      return [];
    }
    const urls = textAreaRef.current.value.split("\n");
    return urls.map((url) => ({ url, title: url }));
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectedGroupName.current = GroupName.fromString(event.target.value);
  };

  const moveBookmarksToTabGroupInternal = async () => {
    const links = getLinks();
    const tabGroupName = selectedGroupName.current?.toString() ?? "Imported";
    await openLinksInTabGroup(tabGroupName, links);
    await refresh();
  };

  const moveBookmarksToFolderInternal = async () => {
    const links = getLinks();
    const bookmarkFolderName = selectedGroupName.current?.toString() ?? "Imported";
    await saveLinksToBookmarkFolder(bookmarkFolderName, links);
    await refresh();
  };

  const mergeBookmarkFolders = async () => {
    const groups = new Map<string, BookmarkGroup[]>();
    let all = "";
    for (const group of bookmarkGroups) {
      all += `${group.title}\n`;
    }
    console.log(all);
    //   const title = GroupName.fromString(group.title);
    //   if (!groups.has(title.text)) {
    //     groups.set(title.text, []);
    //   }
    //   groups.get(title.text)?.push(group);
    // }
    // for (const [title, sameGroups] of groups) {
    //   if (sameGroups.length > 1) {
    //     // get the one with an emoji
    //     const rootGroup = sameGroups.reduce((acc, g) => (acc.title.length > g.title.length ? acc : g));
    //     const otherGroups = sameGroups.filter((g) => g !== rootGroup);
    //     const bookmarksToMove = otherGroups.flatMap((g) => g.bookmarks);
    //     await moveBookmarksToFolder(rootGroup.title, bookmarksToMove);
    //     // await deleteBookmarks(otherGroups.map((g) => g.parent));
    //   }
    // }
  };

  const groupOptionsId = useId();

  return (
    <div className="p-2 min-w-[200px] w-screen lg:max-w-6xl flex flex-col rounded-xl border border-solid border-slate-200 bg-white items-start gap-2.5 shadow-md">
      <div className="flex flex-row w-full gap-x-3">
        <div className="flex flex-row grow">
          <div className="flex flex-row items-center justify-start">
            <button
              className="flex items-center justify-center gap-2 px-2 py-1 font-sans text-sm font-semibold bg-indigo-100 border border-solid rounded-lg hover:bg-indigo-200"
              onClick={mergeBookmarkFolders}
            >
              <ArrowsPointingInIcon className="w-4 h-4" /> Merge Folders
            </button>
          </div>
        </div>
        <div className="flex flex-row items-center justify-end">
          <div className="flex flex-row items-center px-2 py-1 text-sm font-semibold bg-indigo-100 border border-solid rounded-lg">
            <input
              type="text"
              className="bg-indigo-100 w-36"
              placeholder="move"
              list={groupOptionsId}
              onInput={handleInputChange}
            />
            <datalist className="bg-indigo-100 cursor-pointer" id={groupOptionsId}>
              {groupNames.map((group, index) => {
                return <option key={index} value={group.toString()} />;
              })}
            </datalist>
            <div className="w-0 h-4 mx-1.5 border border-slate-400 rounded-t rounded-b" />
            <button onClick={moveBookmarksToTabGroupInternal}>
              <FolderPlusIcon className="w-4 h-4" />
            </button>
            <div className="w-0 h-4 mx-1.5 border border-slate-400 rounded-t rounded-b" />
            <button onClick={moveBookmarksToFolderInternal}>
              <BookmarkSquareIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <textarea
        ref={textAreaRef}
        className="block w-full px-3 py-2 text-xs border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        onChange={onChange}
      />
    </div>
  );
};
