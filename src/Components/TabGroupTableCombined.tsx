import React, { useState } from "react";
import { useEffect, useMemo, useRef } from "react";

import "react-data-grid/lib/styles.css";
import DataGrid, { Column, SelectColumn, RowsChangeData, DataGridHandle } from "react-data-grid";
import { CellExpanderFormatter } from "./CellExpanderFormatter";
import { css } from "@linaria/core";

type TabGroup = chrome.tabGroups.TabGroup;
type Tab = chrome.tabs.Tab;

export type TabGroupCombined = {
  tabs: chrome.tabs.Tab[];
  tabGroup?: chrome.tabGroups.TabGroup;
};

type TabGroupRow =
  | {
      type: "MASTER";
      groupId: number;
      title: string;
      expanded: boolean;
    }
  | {
      type: "DETAIL";
      groupId: number;
      parentId: number;
    };

interface TabGroupStrip {
  groupId: number;
  title: string;
}

interface TabRow {
  id: string;
  index: string;
  title: string;
  url: string;
  favIconUrl: string;
  groupId: number;
}

function createTabGroupRows(tabGroups: Map<number, TabGroupCombined>): TabGroupRow[] {
  const tabGroupRows: TabGroupRow[] = [];
  for (const [groupId, tabGroup] of tabGroups) {
    tabGroupRows.push({
      type: "MASTER",
      groupId: groupId,
      title: tabGroup.tabGroup?.title ?? "",
      expanded: false,
    });
  }
  return tabGroupRows;
}

function convertTabsToRows(tabs: Tab[], groupId: number, tabGroup?: TabGroup): readonly TabRow[] {
  return tabs.map((tab) => ({
    id: tab.id?.toString() ?? "",
    index: tab.index.toString(),
    title: tab.title ?? "",
    url: tab.url ?? "",
    favIconUrl: tab.favIconUrl ?? "",
    tabGroup,
    groupId,
  }));
}

const tabColumns: readonly Column<TabRow>[] = [
  SelectColumn,
  {
    key: "title",
    name: "Title",
    width: 500,
    resizable: true,
    frozen: true,
    formatter: ({ row }) => (
      <a
        href={row.url}
        target="_blank"
        rel="noreferrer"
        className={css`
          display: inline-block;
        `}
      >
        <img
          src={row.favIconUrl}
          className={css`
            width: 16px;
            height: 16px;
            display: inline-block;
            margin: 0 4px;
          `}
        />
        {row.title}
      </a>
    ),
  },
];

export const TabGroupTableCombined: React.FC<{ tabGroupInit: Map<number, TabGroupCombined> }> = ({ tabGroupInit }) => {
  const [rows, setRows] = useState<TabGroupRow[]>([]);
  const [tabGroups, setTabGroups] = useState<Map<number, TabGroupCombined>>(new Map());
  const [columns, setColumns] = useState<Column<TabGroupRow>[]>([]);

  console.log("here  1", tabGroupInit);
  useEffect(() => {
    console.log("here 2", tabGroupInit);
    setRows(createTabGroupRows(tabGroupInit));
    setTabGroups(tabGroupInit);
  }, [tabGroupInit]);

  useEffect(() => {
    setColumns([
      {
        key: "expanded",
        name: "",
        minWidth: 500,
        width: 500,
        colSpan(args) {
          return args.type === "ROW" && args.row.type === "DETAIL" ? 3 : undefined;
        },
        cellClass(row) {
          return row.type === "DETAIL"
            ? css`
                padding: 24px;
              `
            : undefined;
        },
        formatter({ row, isCellSelected, onRowChange }) {
          console.log("test", row.groupId);
          console.log("test 2", tabGroups);
          if (!tabGroups.has(row.groupId)) {
            return <TabGrid tabs={[]} isCellSelected={isCellSelected} />;
          }
          // return (
          //   <TabGrid
          //     tabs={
          //       convertTabsToRows(tabGroups.get(row.groupId)!.tabs, row.groupId, tabGroups.get(row.groupId)!.tabGroup)
          //     }
          //     isCellSelected={isCellSelected}
          //   />
          // );
          if (row.type === "DETAIL") {
            console.log("test", row.groupId);
            console.log("test 2", tabGroups);
            return (
              <TabGrid
                tabs={convertTabsToRows(
                  tabGroups.get(row.groupId)!.tabs,
                  row.groupId,
                  tabGroups.get(row.groupId)!.tabGroup,
                )}
                isCellSelected={isCellSelected}
              />
            );
          }

          return (
            <CellExpanderFormatter
              expanded={row.expanded}
              isCellSelected={isCellSelected}
              onCellExpand={() => {
                onRowChange({ ...row, expanded: !row.expanded });
              }}
            />
          );
        },
      },
      { key: "title", name: "Title", width: 500 },
    ]);
  }, [tabGroups]);

  //   // const columns = useMemo((): readonly Column<TabGroupRow>[] => {
  //   const columns: readonly Column<TabGroupRow>[] = [
  //     // return
  // // }, [tabGroups]);

  function onRowsChange(rows: TabGroupRow[], { indexes }: RowsChangeData<TabGroupRow>) {
    const row = rows[indexes[0]];
    if (row.type === "MASTER") {
      if (!row.expanded) {
        rows.splice(indexes[0] + 1, 1);
      } else {
        rows.splice(indexes[0] + 1, 0, {
          type: "DETAIL",
          groupId: row.groupId,
          parentId: row.groupId,
        });
      }
      setRows(rows);
    }
  }

  return (
    <DataGrid
      rowKeyGetter={rowKeyGetter}
      columns={columns}
      rows={rows}
      onRowsChange={onRowsChange}
      headerRowHeight={45}
      rowHeight={(args) => (args.type === "ROW" && args.row.type === "DETAIL" ? 300 : 45)}
      // rowHeight={(args) => 300}
      className={css`
        block-size: 100%;
      `}
      enableVirtualization={false}
    />
  );
};

const TabGrid: React.FC<{ tabs: readonly TabRow[]; isCellSelected: boolean }> = ({ tabs, isCellSelected }) => {
  const gridRef = useRef<DataGridHandle>(null);
  useEffect(() => {
    if (!isCellSelected) return;
    gridRef.current!.element!.querySelector<HTMLDivElement>('[tabindex="0"]')!.focus({ preventScroll: true });
  }, [isCellSelected]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.isDefaultPrevented()) {
      event.stopPropagation();
    }
  }

  return (
    <div onKeyDown={onKeyDown}>
      <DataGrid ref={gridRef} rows={tabs} columns={tabColumns} rowKeyGetter={rowKeyGetter} style={{ blockSize: 250 }} />
    </div>
  );
};

function rowKeyGetter(row: TabGroupRow | TabRow) {
  return row.groupId;
}
