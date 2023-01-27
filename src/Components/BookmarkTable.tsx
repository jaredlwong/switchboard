import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  ArrowsPointingInIcon,
  BarsArrowDownIcon,
  BookmarkSquareIcon,
  CursorArrowRippleIcon,
  FaceSmileIcon,
  FolderPlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { cx } from "@linaria/core";
import { IconSortAscending, IconSortDescending } from "@tabler/icons";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  Row,
  RowSelectionState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { debounce, truncate } from "lodash";
import React, { HTMLProps, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { changeBookmarkFolderName, deleteBookmarks, moveBookmarksToFolder, openLinksInTabGroup } from "../utils/chrome";
import { getDuplicates, getHostname, relativeTimeFromDates, sortByUrlAndTitle } from "../utils/data";
import { Favicon } from "./FaviconImage";
import { GroupName } from "./shared";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

const IndeterminateCheckbox: React.FC<
  {
    indeterminate?: boolean;
    className?: string;
  } & HTMLProps<HTMLInputElement>
> = ({ indeterminate, className, ...props }) => {
  const ref = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (typeof indeterminate === "boolean" && ref.current) {
      ref.current.indeterminate = !props.checked && indeterminate;
    }
  }, [ref, indeterminate]);

  return <input type="checkbox" ref={ref} className={cx(className, "cursor-pointer")} {...props} />;
};

interface Props {
  parent: Bookmark;
  bookmarks: Bookmark[];
  groupNames: GroupName[];
  refresh: () => Promise<void>;
}

export const BookmarkTable: React.FC<Props> = ({ parent, bookmarks, groupNames, refresh }) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<GroupName>(GroupName.fromString(parent.title));
  const selectedGroupName = useRef<GroupName | undefined>(undefined);

  useEffect(() => {
    changeBookmarkFolderName(parent, groupName.toString());
  }, [groupName]);

  type Link = { url: string; title: string };

  type CB<T> = ColumnDef<Bookmark, T>;

  const columns = useMemo<(CB<number> | CB<Date> | CB<Link>)[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <IndeterminateCheckbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <IndeterminateCheckbox
            checked={row.getIsSelected()}
            indeterminate={row.getIsSomeSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      } satisfies CB<number>,
      {
        id: "title",
        accessorFn: (row) => ({ url: row.url ?? "", title: row.title } satisfies Link),
        header: "Title",
        cell: (props) => (
          <a href={props.getValue().url} target="_blank" rel="noreferrer">
            {props.getValue().title}
          </a>
        ),
        enableSorting: true,
        sortingFn: (rowA: Row<Bookmark>, rowB: Row<Bookmark>, columnId: string) => {
          return rowA.getValue<Link>(columnId).url < rowB.getValue<Link>(columnId).url ? 1 : -1;
        },
      } satisfies CB<Link>,
      {
        id: "hostname",
        accessorFn: (row) => row.url ?? "",
        header: "Host",
        enableSorting: true,
        sortingFn: "alphanumeric",
      } satisfies CB<string>,
      {
        id: "date_added",
        accessorFn: (row) => (row.dateAdded ? new Date(row.dateAdded) : new Date()),
        header: "Date Added",
        enableSorting: true,
        sortingFn: "datetime",
        cell: (props) => relativeTimeFromDates(props.getValue()),
      } satisfies CB<Date>,
    ],
    [],
  );

  const table = useReactTable<Bookmark>({
    data: bookmarks,
    columns,
    state: {
      rowSelection,
      sorting,
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // debugTable: true,
    // debugHeaders: true,
    // debugColumns: true,
  });

  const deleteSelfIfEmpty = async () => {
    const folders = await chrome.bookmarks.get(parent.id);
    const emptyFolders = folders.filter((folder) => {
      return folder.children === undefined || folder.children?.length === 0;
    });
    await deleteBookmarks(emptyFolders);
  };

  const deleteSelectedBookmarks = async () => {
    const selectedBookmarks = table.getSelectedRowModel().flatRows.map((row) => row.original);
    setRowSelection({});
    if (selectedBookmarks) {
      await deleteBookmarks(selectedBookmarks);
    }
    await deleteSelfIfEmpty();
    await refresh();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectedGroupName.current = GroupName.fromString(event.target.value);
  };

  const moveBookmarksToTabGroupInternal = useCallback(async () => {
    const bookmarks = table.getSelectedRowModel().flatRows.map((row) => row.original);
    if (bookmarks.length === 0) {
      return;
    }
    const tabGroupName = selectedGroupName.current?.toString() ?? groupName.toString();
    await openLinksInTabGroup(tabGroupName, bookmarks);
    await refresh();
  }, [groupName]);

  const moveBookmarksToFolderInternal = async () => {
    const bookmarks = table.getSelectedRowModel().flatRows.map((row) => row.original);
    setRowSelection({});
    if (selectedGroupName.current === undefined || bookmarks.length === 0) {
      return;
    }
    await moveBookmarksToFolder(selectedGroupName.current.toString(), bookmarks);
    await deleteSelfIfEmpty();
    await refresh();
  };

  const handleGroupTextNameChange = useCallback(
    debounce((e: React.FormEvent<HTMLSpanElement>) => {
      const newName = (e.target as HTMLElement).innerText;
      setGroupName(groupName.withText(newName));
    }, 500),
    [],
  );

  const handleEmojiPickerClicked = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiSelected = (emoji: any) => {
    // todo handle ungrouped
    setGroupName(groupName.withEmoji(emoji.native));
    setShowEmojiPicker(false);
  };

  const sortSelectedBookmarks = async () => {
    const bookmarks = table.getSelectedRowModel().flatRows.map((row) => row.original);
    setRowSelection({});
    if (bookmarks.length === 0) {
      return;
    }
    bookmarks.sort((a, b) => ((a.url ?? "") > (b.url ?? "") ? 1 : -1));
    sortByUrlAndTitle(bookmarks);
    for (const bookmark of bookmarks) {
      await chrome.bookmarks.move(bookmark.id, { index: bookmarks.length, parentId: parent.id });
    }
  };

  const deleteDuplicateBookmarks = useCallback(async () => {
    const bookmarks = table.getSelectedRowModel().flatRows.map((row) => row.original);
    setRowSelection({});
    if (bookmarks.length === 0) {
      return;
    }
    const dupes = getDuplicates(bookmarks);
    await deleteBookmarks(dupes);
  }, []);

  const selectFirstFifty = async () => {
    const selection: RowSelectionState = {};
    for (let i = 0; i < Math.min(bookmarks.length, 50); i++) {
      selection[i.toString()] = true;
    }
    setRowSelection(selection);
    if (bookmarks.length === 0) {
      return;
    }
  };

  const groupOptionsId = useId();

  return (
    <div className="p-2 min-w-[200px] w-screen lg:max-w-6xl flex flex-col rounded-xl border border-solid border-slate-200 bg-white items-start gap-2.5 shadow-md">
      {/* fucking hell doesn't work with floating div */}
      {/* https://coder-coder.com/z-index-isnt-working/ */}
      {/* drop-shadow-md */}
      <div className="flex flex-row w-full">
        <div className="flex flex-row items-center gap-x-2 grow">
          <div className="flex items-center gap-0 px-2 py-1 font-sans text-sm font-semibold bg-indigo-100 border border-solid rounded-lg hover:bg-indigo-200">
            <button className="font-sans text-sm font-semibold text-slate-800" onClick={handleEmojiPickerClicked}>
              {groupName.emoji || <FaceSmileIcon className="w-4 h-4" />}
            </button>
            {showEmojiPicker && (
              <div className="relative">
                <div className="absolute top-5 -left-6">
                  <Picker data={data} onEmojiSelect={handleEmojiSelected} />
                </div>
              </div>
            )}
            <div className="w-0 h-4 mx-1.5 border border-slate-400 rounded-t rounded-b" />
            <span
              className="font-sans text-sm font-semibold text-slate-800 min-w-[5px]"
              contentEditable={true}
              onInput={handleGroupTextNameChange}
              suppressContentEditableWarning={true}
            >
              {groupName.text ?? "Ungrouped"}
            </span>
          </div>
          {/* <span className="font-sans text-base font-semibold text-slate-800">{parent.title}</span> */}
          <div className="flex items-center p-1 rounded-2xl bg-violet-50">
            <span className="px-1 text-xs font-semibold leading-4 text-center text-violet-700">
              {bookmarks.length} bookmarks
            </span>
          </div>
          <div className="flex flex-row items-center justify-end">
            <button
              className="flex items-center justify-center gap-2 px-2 py-1 font-sans text-sm font-semibold bg-indigo-100 border border-solid rounded-lg hover:bg-indigo-200"
              onClick={selectFirstFifty}
            >
              <CursorArrowRippleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-row gap-x-3">
          <div className="flex flex-row items-center justify-end">
            <button
              className="flex items-center justify-center gap-2 px-2 py-1 font-sans text-sm font-semibold bg-indigo-100 border border-solid rounded-lg hover:bg-indigo-200"
              onClick={sortSelectedBookmarks}
            >
              <BarsArrowDownIcon className="w-4 h-4" /> Sort
            </button>
          </div>
          <div className="flex flex-row items-center justify-end">
            <button
              className="flex items-center justify-center gap-2 px-2 py-1 font-sans text-sm font-semibold bg-indigo-100 border border-solid rounded-lg hover:bg-indigo-200"
              onClick={deleteDuplicateBookmarks}
            >
              <ArrowsPointingInIcon className="w-4 h-4" /> Uniq
            </button>
          </div>
          <div className="flex flex-row items-center justify-end">
            <button
              className="flex items-center justify-center gap-2 px-2 py-1 font-sans text-sm font-semibold bg-indigo-100 border border-solid rounded-lg hover:bg-indigo-200"
              onClick={deleteSelectedBookmarks}
            >
              <TrashIcon className="w-4 h-4" /> Delete
            </button>
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
      </div>
      <table className="w-full text-left border-collapse table-auto">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const iftitle = (clazz: string, other?: string) => (header.id === "title" ? clazz : other ?? "");
                return (
                  <th
                    key={header.id}
                    className={cx(iftitle("w-full"), "h-6 whitespace-nowrap border-b border-b-slate-300")}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cx(
                          "flex items-center",
                          iftitle("justify-start pl-2.5", "justify-center"),
                          header.column.getCanSort() ? "cursor-pointer select-none" : "",
                          // "max-w-[1%] whitespace-nowrap",
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <IconSortAscending size={16} />, // emoji.of("arrow_up").string,
                          desc: <IconSortDescending size={16} />, // emoji.of("arrow_down").string,
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => {
                if (cell.column.id === "title") {
                  return (
                    <td key={cell.id} className="h-6 border-b border-b-slate-300">
                      <div className="flex flex-no-wrap pl-1.5 min-w-0 items-center hover:underline cursor-pointer">
                        <Favicon url={cell.getValue<Link>().url} />
                        {/* <span className="inline-block min-w-0 overflow-scroll whitespace-nowrap scrollbar-hide"> */}
                        <a href={cell.getValue<Link>().url} target="_blank" rel="noreferrer">
                          {/* {cell.getValue<Link>().title} */}
                          {truncate(cell.getValue<Link>().title, { length: 120 })}
                        </a>
                        {/* <span> */}
                        {/* {cell.getValue<Link>().title} */}
                        {/* {flexRender(cell.column.columnDef.cell, cell.getContext())} */}
                        {/* </span> */}
                      </div>
                    </td>
                  );
                } else if (cell.column.id === "hostname") {
                  const url = cell.getValue<string>();
                  const hostname = getHostname(url) ?? url;
                  return (
                    <td key={cell.id} className="h-6 border-b border-b-slate-300 text-nowrap whitespace-nowrap">
                      <div className="flex items-center justify-start">{hostname}</div>
                    </td>
                  );
                } else if (cell.column.id === "date_added") {
                  return (
                    <td key={cell.id} className="h-6 border-b border-b-slate-300 text-nowrap whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </td>
                  );
                } else {
                  return (
                    <td key={cell.id} className="h-6 border-b border-b-slate-300 text-nowrap whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </td>
                  );
                }
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
