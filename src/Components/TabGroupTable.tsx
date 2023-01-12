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

// const styles = require("./TabGroupTable.module.css");
import styles from "./TabGroupTable.module.css";
import "react-data-grid/lib/styles.css";
import DataGrid, { Column, SelectColumn } from "react-data-grid";

type TabGroup = chrome.tabGroups.TabGroup;
type Tab = chrome.tabs.Tab;

// expands object types one level deep
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// expands object types recursively
type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;

type ExpandedTabGroup = ExpandRecursively<TabGroup>;
type ExpandedTab = ExpandRecursively<Tab>;

interface Row {
  index: string;
  title: string;
  id: string;
  groupId: string;
  url: string;
  favIconUrl: string;
}

const columns: readonly Column<Row>[] = [
  SelectColumn,
  {
    key: "index",
    name: "Index",
    width: 100,
    resizable: false,
    frozen: true,
  },
  {
    key: "id",
    name: "ID",
    width: 100,
    resizable: false,
    frozen: true,
  },
  {
    key: "groupId",
    name: "Group ID",
    width: 100,
    resizable: false,
    frozen: true,
  },
  {
    key: "title",
    name: "Title",
    width: 500,
    resizable: true,
    frozen: true,
    formatter: ({ row }) => (
      <a href={row.url} target="_blank" rel="noreferrer" className={styles.link}>
        <img src={row.favIconUrl} className={styles.favicon} />
        {row.title}
      </a>
    ),
  },
];

function createRows(tabs: Tab[]): Row[] {
  return tabs.map((tab) => ({
    index: tab.index.toString(),
    id: tab.id?.toString() ?? "",
    title: tab.title ?? "",
    groupId: tab.groupId?.toString() ?? "",
    url: tab.url ?? "",
    favIconUrl: tab.favIconUrl ?? "",
  }));
}

export const TabGroupTable: React.FC<{ tabs: Tab[] }> = ({ tabs }) => {
  return <DataGrid columns={columns} rows={createRows(tabs)} />;
};
