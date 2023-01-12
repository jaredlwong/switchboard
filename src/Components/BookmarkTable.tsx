import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import React from "react";

type Bookmark = chrome.bookmarks.BookmarkTreeNode;

function timestampToRelativeDate(timestamp: number): string {
  const now = new Date();
  const inputDate = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const inputDateOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
  if (inputDateOnly.getTime() === today.getTime()) {
    return "Today";
  } else if (inputDateOnly.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    return `${inputDate.getMonth() + 1}/${inputDate.getDate()}/${inputDate.getFullYear().toString().slice(-2)}`;
  }
}

const columnHelper = createColumnHelper<Bookmark>();

// // expands object types one level deep
// type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// // expands object types recursively
// type ExpandRecursively<T> = T extends object
//   ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
//   : T;

// type Test<TData extends RowData, TValue = unknown> = ExpandRecursively<DisplayColumnDef<TData, TValue>>

const columns = [
  columnHelper.accessor((row) => row.index, { header: "Index" }),
  columnHelper.accessor(
    (row) => {
      const timestamp = row.dateAdded;
      return timestamp === undefined ? "" : timestampToRelativeDate(timestamp);
    },
    { header: "Date Added" },
  ),
  columnHelper.accessor(
    (row) => {
      return { url: row.url, title: row.title };
    },
    {
      header: "Title",
      cell: (props) => (
        <a href={props.getValue().url} target="_blank" rel="noreferrer">
          {props.getValue().title}
        </a>
      ),
    },
  ),
  columnHelper.accessor("id", {
    cell: (info) => info.getValue(),
  }),
];

export const BookmarkTable: React.FC<{ path: string[]; bookmarks: Bookmark[] }> = ({ path, bookmarks }) => {
  const table = useReactTable<Bookmark>({
    data: bookmarks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
  });

  return (
    <div className="p-2">
      <table className="table-fixed">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  {...{
                    key: header.id,
                    colSpan: header.colSpan,
                  }}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
