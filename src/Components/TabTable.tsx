import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { css, cx } from "@linaria/core";
import {
  IconFolderMinus,
  IconLayoutGridAdd,
  IconSortAscending,
  IconSortDescending,
  IconTrash,
  IconVolume,
  IconVolumeOff,
} from "@tabler/icons";
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
import { debounce } from "lodash";
import React, { HTMLProps, useCallback, useEffect, useMemo, useState } from "react";
import {
  addTabsToExistingGroup,
  changeTabGroupName,
  closeTab,
  closeTabs,
  focusOnTab,
  muteTab,
  saveTabsToBookmarkTree,
  saveTabsToFolder,
  unmuteTab,
} from "../utils/chrome";
import { extractLeadingEmoji, stripLeadingEmoji } from "../utils/data";
import { Favicon } from "./FaviconImage";

const IndeterminateCheckbox: React.FC<
  {
    indeterminate?: boolean;
    className?: string;
  } & HTMLProps<HTMLInputElement>
> = ({ indeterminate, className, ...props }) => {
  const ref = React.useRef<HTMLInputElement>(null!);

  React.useEffect(() => {
    if (typeof indeterminate === "boolean") {
      ref.current.indeterminate = !props.checked && indeterminate;
    }
  }, [ref, indeterminate]);

  return <input type="checkbox" ref={ref} className={cx(className, "cursor-pointer")} {...props} />;
};

const MuteButton: React.FC<{ tab: chrome.tabs.Tab }> = ({ tab }) => {
  let inner = <></>;
  if (tab.mutedInfo?.muted) {
    inner = (
      <button onClick={() => unmuteTab(tab)}>
        <IconVolumeOff size={16} />
      </button>
    );
  } else if (tab.audible) {
    inner = (
      <button onClick={() => muteTab(tab)}>
        <IconVolume size={16} />
      </button>
    );
  }
  return (
    <div>
      <div key={tab.id} className="flex items-center justify-center w-full h-6 border-b border-gray-200">
        {inner}
      </div>
    </div>
  );
};

export type GroupOption =
  | { type: "tabGroup"; value: chrome.tabGroups.TabGroup }
  | { type: "bookmarkFolder"; value: chrome.bookmarks.BookmarkTreeNode };

interface Props {
  tabGroup?: chrome.tabGroups.TabGroup;
  tabs: chrome.tabs.Tab[];
  groupOptions: GroupOption[];
}

export const TabTable: React.FC<Props> = ({ tabGroup, tabs, groupOptions }) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupOption | undefined>(undefined);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [groupEmoji, setGroupEmoji] = useState<string | undefined>(undefined);
  const [groupTextName, setGroupTextName] = useState<string | undefined>(undefined);

  type Link = { url: string; title: string };

  type CB<T> = ColumnDef<chrome.tabs.Tab, T>;

  const closeTabInternal = async (tab: chrome.tabs.Tab) => {
    await closeTab(tab);
  };

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
        accessorFn: (row) => ({ url: row.url ?? "", title: row.title ?? "" } satisfies Link),
        header: "Title",
        cell: (props) => (
          <a href={props.getValue().url} target="_blank" rel="noreferrer">
            {props.getValue().title}
          </a>
        ),
        enableSorting: true,
        sortingFn: (rowA: Row<chrome.tabs.Tab>, rowB: Row<chrome.tabs.Tab>, columnId: string) => {
          return rowA.getValue<Link>(columnId).url < rowB.getValue<Link>(columnId).url ? 1 : -1;
        },
      } satisfies CB<Link>,
      {
        id: "mute_tab",
        header: () => <></>,
        cell: ({ row }) => <MuteButton tab={row.original} />,
      } satisfies CB<number>,
      {
        id: "close_tab",
        header: () => <></>,
        cell: ({ row }) => (
          <div className="flex items-center justify-center w-full h-6 group">
            <button onClick={() => closeTabInternal(row.original)}>
              <IconTrash size={16} />
            </button>
          </div>
        ),
      } satisfies CB<number>,
      // {
      //   id: "last_opened",
      //   accessorFn: (row) => (row.dateAdded ? new Date(row.dateAdded) : new Date()),
      //   header: "Last Opened",
      //   enableSorting: true,
      //   sortingFn: "datetime",
      //   cell: (props) => relativeTimeFromDates(props.getValue()),
      // } satisfies CB<Date>,
    ],
    [],
  );

  const table = useReactTable<chrome.tabs.Tab>({
    data: tabs,
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
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
  });

  const closeSelectedTabs = async () => {
    const tabs = table.getSelectedRowModel().flatRows.map((row) => row.original);
    setRowSelection({});
    await closeTabs(tabs);
  };

  const bookmarkGroupInternal = async () => {
    await saveTabsToFolder(tabGroup?.title ?? "Ungrouped", tabs);
    await closeTabs(tabs);
  };

  const handleSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGroup(groupOptions[Number(event.target.value)]);
  };

  const saveTabsToGroup = async () => {
    if (selectedGroup === undefined) {
      return;
    }
    const tabs = table.getSelectedRowModel().flatRows.map((row) => row.original);
    if (selectedGroup.type === "bookmarkFolder") {
      setRowSelection({});
      await saveTabsToBookmarkTree(selectedGroup.value, tabs);
      await closeTabs(tabs);
    } else if (selectedGroup.type === "tabGroup") {
      await addTabsToExistingGroup(selectedGroup.value, tabs);
    }
  };

  useEffect(() => {
    // this is the top-left selection
    setSelectedGroup(groupOptions[0]);
    // this is the group name
    const emoji = extractLeadingEmoji(tabGroup?.title);
    setGroupEmoji(emoji ? emoji : undefined);
    setGroupTextName(stripLeadingEmoji(tabGroup?.title));
  }, []);

  // update group name
  useEffect(() => {
    const groupName = groupEmoji ? `${groupEmoji} ${groupTextName}` : groupTextName ?? "";
    if (tabGroup) {
      console.log(`changing group name to ${groupName}`);
      changeTabGroupName(tabGroup, groupName);
    }
  }, [groupEmoji, groupTextName]);

  const handleGroupTextNameChange = useCallback(
    debounce((e: React.FormEvent<HTMLSpanElement>) => {
      const newName = (e.target as HTMLElement).innerText;
      setGroupTextName(newName);
    }, 500),
    [],
  );

  const handleEmojiPickerClicked = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiSelected = (emoji: any) => {
    // todo handle ungrouped
    setGroupEmoji(emoji.native);
    setShowEmojiPicker(false);
  };

  return (
    // <div className="p-2 min-w-[200px] lg:max-w-6xl">
    <div className="p-2 min-w-[200px] w-screen lg:max-w-6xl flex flex-col rounded-xl border border-solid border-slate-200 bg-white items-start gap-2.5 drop-shadow-md">
      <div className="flex flex-row w-full">
        <div className="flex flex-row items-center gap-x-2 grow">
          <div className="flex items-center gap-0 px-2 py-1 font-sans text-sm font-semibold bg-indigo-100 border border-solid rounded-lg hover:bg-indigo-200">
            <button className="font-sans text-sm font-semibold text-slate-800" onClick={handleEmojiPickerClicked}>
              {groupEmoji ?? "☺"}
            </button>
            {showEmojiPicker && (
              <div
                className={css`
                  position: absolute;
                  top: 40px;
                  left: 10px;
                `}
              >
                <Picker data={data} onEmojiSelect={handleEmojiSelected} />
              </div>
            )}
            <div className="w-0 h-4 mx-1.5 border border-slate-400 rounded-t rounded-b" />
            <span
              className="font-sans text-sm font-semibold text-slate-800 min-w-[5px]"
              contentEditable={true}
              onInput={handleGroupTextNameChange}
              suppressContentEditableWarning={true}
            >
              {groupTextName ?? "Ungrouped"}
            </span>
          </div>
          <div className="flex items-center p-1 rounded-2xl bg-violet-50">
            <span className="px-1 text-xs font-semibold leading-4 text-center text-violet-700">{tabs.length} tabs</span>
          </div>
        </div>
        <div className="flex flex-row gap-x-3">
          <div className="flex flex-row items-center justify-end">
            <button
              className="flex items-center justify-center gap-2 px-2 py-1 font-sans text-sm font-semibold bg-indigo-100 border border-solid rounded-lg hover:bg-indigo-200"
              onClick={bookmarkGroupInternal}
            >
              <IconFolderMinus size={16} /> Bookmark Group
            </button>
          </div>
          <div className="flex flex-row items-center justify-end">
            <button
              className="flex items-center justify-center gap-2 px-2 py-1 font-sans text-sm font-semibold bg-indigo-100 border border-solid rounded-lg hover:bg-indigo-200"
              onClick={closeSelectedTabs}
            >
              <IconTrash size={16} /> Close Tabs
            </button>
          </div>
          <div className="flex flex-row items-center justify-end">
            <div className="flex flex-row items-center px-2 py-1 text-sm font-semibold bg-indigo-100 border border-solid rounded-lg">
              <select className="bg-indigo-100 cursor-pointer" onChange={handleSelectionChange}>
                {groupOptions.map((group, index) => (
                  <option key={index} value={index}>
                    {group.type === "bookmarkFolder" ? `📚 ${group.value.title}` : `📁 ${group.value.title}`}
                  </option>
                ))}
              </select>
              <div className="w-0 h-4 mx-1.5 border border-slate-400 rounded-t rounded-b" />
              <button onClick={saveTabsToGroup}>
                <IconLayoutGridAdd size={16} />
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
                    <td className="h-6 border-b border-b-slate-300">
                      <div className="flex flex-no-wrap pl-1.5 min-w-0 items-center hover:underline cursor-pointer">
                        <Favicon url={cell.getValue<Link>().url} />
                        {/* <span className="inline-block min-w-0 overflow-scroll whitespace-nowrap scrollbar-hide"> */}
                        <span onClick={() => focusOnTab(cell.row.original)}>
                          {/* {cell.getValue<Link>().title} */}
                          {/* {flexRender(cell.column.columnDef.cell, cell.getContext())} */}
                          {/* <a href={cell.getValue<Link>().url} target="_blank" rel="noreferrer"> */}
                          {cell.getValue<Link>().title}
                          {/* </a> */}
                        </span>
                      </div>
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
                      <div className={cx("flex items-center justify-center", cell.column.id !== "select" ? "w-6" : "")}>
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
