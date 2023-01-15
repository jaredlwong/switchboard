import { cx } from "@linaria/core";
import { IconFolderPlus, IconSortAscending, IconSortDescending, IconTrash } from "@tabler/icons";
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
import React, { HTMLProps, useMemo, useState } from "react";
import { createTabGroup, deleteBookmarks } from "../tabs";
import { Favicon } from "./FaviconImage";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

const units: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 31536000000 },
  { unit: "month", ms: 2628000000 },
  { unit: "day", ms: 86400000 },
  { unit: "hour", ms: 3600000 },
  { unit: "minute", ms: 60000 },
  { unit: "second", ms: 1000 },
];
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * Get language-sensitive relative time message from Dates.
 * @param relative  - the relative dateTime, generally is in the past or future
 * @param pivot     - the dateTime of reference, generally is the current time
 */
export function relativeTimeFromDates(relative: Date | null, pivot: Date = new Date()): string {
  if (!relative) return "";
  const elapsed = relative.getTime() - pivot.getTime();
  return relativeTimeFromElapsed(elapsed);
}

/**
 * Get language-sensitive relative time message from elapsed time.
 * @param elapsed   - the elapsed time in milliseconds
 */
export function relativeTimeFromElapsed(elapsed: number): string {
  for (const { unit, ms } of units) {
    if (Math.abs(elapsed) >= ms || unit === "second") {
      return rtf.format(Math.round(elapsed / ms), unit);
    }
  }
  return "";
}

// // expands object types one level deep
// type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// // expands object types recursively
// type ExpandRecursively<T> = T extends object
//   ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
//   : T;

// type Test<TData extends RowData, TValue = unknown> = ExpandRecursively<DisplayColumnDef<TData, TValue>>

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

export const BookmarkTable: React.FC<{ parent: Bookmark; bookmarks: Bookmark[] }> = ({ parent, bookmarks }) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

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
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
  });

  const deleteSelectedBookmarks = async () => {
    const bookmarks = table.getSelectedRowModel().flatRows.map((row) => row.original);
    setRowSelection({});
    await deleteBookmarks(bookmarks);
  };

  const openBookmarks = async () => {
    await createTabGroup(parent.title, bookmarks);
  };

  return (
    // <div className="p-2 min-w-[200px] lg:max-w-6xl">
    <div className="p-2 min-w-[200px] w-screen lg:max-w-6xl flex flex-col rounded-xl border border-solid border-slate-200 bg-white items-start gap-2.5">
      <div className="flex flex-row w-full">
        <div className="flex flex-row items-center gap-x-2 grow">
          <span className="font-sans text-base font-semibold text-slate-800">{parent.title}</span>
          <div className="flex items-center p-1 rounded-2xl bg-violet-50">
            <span className="px-1 text-xs font-semibold leading-4 text-center text-violet-700">
              {bookmarks.length} bookmarks
            </span>
          </div>
        </div>
        <div className="flex flex-row gap-x-3">
          <div className="flex flex-row items-center justify-end">
            <button
              className="flex items-center justify-center gap-2 px-2 py-1 font-sans text-sm font-semibold bg-indigo-100 border border-solid rounded-lg hover:bg-indigo-200"
              onClick={openBookmarks}
            >
              <IconFolderPlus size={16} /> Create Tab Group
            </button>
          </div>
          <div className="flex flex-row items-center justify-end">
            <button
              className="flex items-center justify-center gap-2 px-2 py-1 font-sans text-sm font-semibold bg-indigo-100 border border-solid rounded-lg hover:bg-indigo-200"
              onClick={deleteSelectedBookmarks}
            >
              <IconTrash size={16} /> Delete Bookmarks
            </button>
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
                        <span>
                          {cell.getValue<Link>().title}
                          {/* {flexRender(cell.column.columnDef.cell, cell.getContext())} */}
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
