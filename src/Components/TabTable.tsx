import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { BookmarkSquareIcon, FaceSmileIcon, FolderPlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { cx } from "@linaria/core";
import { IconSortAscending, IconSortDescending, IconTrash, IconVolume, IconVolumeOff } from "@tabler/icons";
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
import React, { HTMLProps, useCallback, useId, useMemo, useState } from "react";
import {
  addTabsToGroup,
  changeTabGroupName,
  closeTab,
  closeTabs,
  focusOnTab,
  muteTab,
  saveTabsToBookmarkFolder,
  unmuteTab,
} from "../utils/chrome";
import { getHostname, relativeTimeFromEpoch } from "../utils/data";
import { Favicon } from "./FaviconImage";
import { GroupName, TabInfo } from "./shared";

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

const MuteButton: React.FC<{ tab: TabInfo }> = ({ tab }) => {
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

interface Props {
  tabGroup?: chrome.tabGroups.TabGroup;
  tabs: TabInfo[];
  groupNames: GroupName[];
}

export const TabTable: React.FC<Props> = ({ tabGroup, tabs, groupNames }) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(undefined);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  // const [groupName, setGroupName] = useState<GroupName>(GroupName.fromString(tabGroup?.title ?? ""));
  // // update group name
  // useEffect(() => {
  //   if (tabGroup) {
  //     changeTabGroupName(tabGroup, groupName.toString());
  //   }
  // }, [groupName]);

  type Link = { url: string; title: string };

  type CB<T> = ColumnDef<TabInfo, T>;

  const closeTabInternal = async (tab: TabInfo) => {
    await closeTab(tab);
  };

  const columns = useMemo<(CB<number> | CB<Date> | CB<Link> | CB<string>)[]>(
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
        enableSorting: true,
        sortingFn: (rowA: Row<TabInfo>, rowB: Row<TabInfo>, columnId: string) => {
          return rowA.getValue<Link>(columnId).url < rowB.getValue<Link>(columnId).url ? 1 : -1;
        },
      } satisfies CB<Link>,
      {
        id: "hostname",
        accessorFn: (row) => row.url ?? "",
        header: "",
        enableSorting: true,
        sortingFn: "alphanumeric",
        // cell: (props) => {
        //   return <></>;
        // const tabId = props.getValue<number>();
        // if (tabId === -1) {
        //   return "";
        // }
        // return "";
        // const key = `tab=${tabId}`;
        // const data = await chrome.storage.session.get(key);
        // const tabStorage = TabStorage.fromDict(data[key] ?? {});
        // return relativeTimeFromElapsed(tabStorage.lastActive);
        // },
      } satisfies CB<string>,
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
      {
        id: "last_active",
        accessorFn: (row) => row.lastActive ?? -1,
        header: "Last Active",
        enableSorting: true,
        sortingFn: "basic",
      } satisfies CB<number>,
    ],
    [],
  );

  const table = useReactTable<TabInfo>({
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
    // debugTable: true,
    // debugHeaders: true,
    // debugColumns: true,
  });

  const closeSelectedTabs = async () => {
    const selectedTabs = table.getSelectedRowModel().flatRows.map((row) => row.original);
    setRowSelection({});
    if (selectedTabs) {
      await closeTabs(selectedTabs);
    }
  };

  const moveTabsToGroupInternal = useCallback(async () => {
    const selectedTabs = table.getSelectedRowModel().flatRows.map((row) => row.original);
    if (selectedGroup === undefined || selectedTabs.length == 0) {
      return;
    }
    setRowSelection({});
    await addTabsToGroup(selectedGroup.toString(), selectedTabs);
  }, [selectedGroup]);

  const moveTabsToFolderInternal = useCallback(async () => {
    const selectedTabs = table.getSelectedRowModel().flatRows.map((row) => row.original);
    if (selectedGroup === undefined || selectedTabs.length == 0) {
      return;
    }
    setRowSelection({});
    await saveTabsToBookmarkFolder(selectedGroup.toString(), selectedTabs);
    await closeTabs(selectedTabs);
  }, [selectedGroup]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedGroup(event.target.value);
  };

  const changeTabGroupNameInternal = async (
    id?: number,
    options?: {
      oldName?: string;
      newEmoji?: string;
      newText?: string;
    },
  ) => {
    if (id !== undefined && id !== -1 && options !== undefined) {
      const groupName = GroupName.merge(options);
      return changeTabGroupName(id, groupName.toString());
    }
  };

  const handleGroupTextNameChange = useCallback(
    debounce((e: React.FormEvent<HTMLSpanElement>) => {
      const newText = (e.target as HTMLElement).innerText;
      changeTabGroupNameInternal(tabGroup?.id, { oldName: tabGroup?.title, newText });
    }, 500),
    [tabGroup],
  );

  const handleEmojiPickerClicked = useCallback(() => {
    setShowEmojiPicker(!showEmojiPicker);
  }, [showEmojiPicker]);

  const handleEmojiSelected = useCallback(
    (emoji: any) => {
      // todo handle ungrouped
      changeTabGroupNameInternal(tabGroup?.id, { oldName: tabGroup?.title, newEmoji: emoji.native });
      setShowEmojiPicker(false);
    },
    [tabGroup],
  );

  const groupOptionsId = useId();

  const groupName = GroupName.fromString(tabGroup?.title ?? "");

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
              {groupName.text || "Ungrouped"}
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
              onClick={closeSelectedTabs}
            >
              <TrashIcon className="w-4 h-4" /> Close Tabs
            </button>
          </div>
          <div className="flex flex-row items-center justify-end">
            <div className="flex flex-row items-center px-2 py-1 text-sm font-semibold bg-indigo-100 border border-solid rounded-lg">
              <input
                type="text"
                className="bg-indigo-100 w-36"
                placeholder="move"
                list={groupOptionsId}
                onChange={handleInputChange}
              />
              <datalist className="bg-indigo-100 cursor-pointer" id={groupOptionsId}>
                {groupNames.map((group, index) => {
                  return <option key={index} value={group.toString()} />;
                })}
              </datalist>
              <div className="w-0 h-4 mx-1.5 border border-slate-400 rounded-t rounded-b" />
              <button onClick={moveTabsToGroupInternal}>
                <FolderPlusIcon className="w-4 h-4" />
              </button>
              <div className="w-0 h-4 mx-1.5 border border-slate-400 rounded-t rounded-b" />
              <button onClick={moveTabsToFolderInternal}>
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
                if (cell.column.id === "select") {
                  return (
                    <td key={cell.id} className="h-6 border-b border-b-slate-300 text-nowrap whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </td>
                  );
                } else if (cell.column.id === "title") {
                  return (
                    <td key={cell.id} className="h-6 border-b border-b-slate-300">
                      <div className="flex flex-no-wrap pl-1.5 min-w-0 items-center hover:underline cursor-pointer">
                        <Favicon url={cell.getValue<Link>().url} />
                        {/* <span className="inline-block min-w-0 overflow-scroll whitespace-nowrap scrollbar-hide"> */}
                        <span onClick={() => focusOnTab(cell.row.original)}>
                          {/* {cell.getValue<Link>().title} */}
                          {/* {flexRender(cell.column.columnDef.cell, cell.getContext())} */}
                          {/* <a href={cell.getValue<Link>().url} target="_blank" rel="noreferrer"> */}
                          {truncate(cell.getValue<Link>().title, { length: 150 })}
                          {/* </a> */}
                        </span>
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
                } else if (cell.column.id === "mute_tab" || cell.column.id === "close_tab") {
                  return (
                    <td key={cell.id} className="h-6 border-b border-b-slate-300 text-nowrap whitespace-nowrap">
                      <div className="flex items-center justify-center w-6">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </td>
                  );
                } else if (cell.column.id === "last_active") {
                  const lastActive = cell.getValue<number>();
                  return (
                    <td key={cell.id} className="h-6 border-b border-b-slate-300 text-nowrap whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        <span>{lastActive !== -1 ? relativeTimeFromEpoch(lastActive) : ""}</span>
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
