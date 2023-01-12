import { css } from "@linaria/core";
import {
  ColumnResizeMode,
  createColumnHelper,
  DisplayColumnDef,
  flexRender,
  getCoreRowModel,
  RowData,
  useReactTable,
} from "@tanstack/react-table";
import React, { useState } from "react";

// expands object types one level deep
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// expands object types recursively
type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;

type Test<TData extends RowData, TValue = unknown> = ExpandRecursively<DisplayColumnDef<TData, TValue>>;
type XXX = ExpandRecursively<chrome.tabs.Tab>;

interface TabWithGroup {
  tab: chrome.tabs.Tab;
  group?: chrome.tabGroups.TabGroup;
}

const columnHelper = createColumnHelper<TabWithGroup>();
const columns = [
  columnHelper.accessor(
    (row) => {
      return { url: row.tab.url, title: row.tab.title, favIconUrl: row.tab.favIconUrl };
    },
    {
      header: "Title",
      cell: (props) => (
        <a
          href={props.getValue().url}
          target="_blank"
          rel="noreferrer"
          className={css`
            display: inline-block;
          `}
        >
          <img
            src={props.getValue().favIconUrl}
            className={css`
              width: 16px;
              height: 16px;
              display: inline-block;
              margin: 0 4px;
            `}
          />
          {props.getValue().title}
        </a>
      ),
    },
  ),
];

export const TabGroupTableDense: React.FC<{ tabs: TabWithGroup[] }> = ({ tabs }) => {
  const table = useReactTable<TabWithGroup>({
    data: tabs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
  });

  return (
    <div className="flex flex-col w-full">
      {table.getRowModel().rows.map((row) => (
        <div key={row.id}>
          {row.getVisibleCells().map((cell) => (
            <div key={cell.id} className="grow">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
