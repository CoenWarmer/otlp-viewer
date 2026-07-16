"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  ColumnOrderState,
  Row,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowRightSLine as RiChevronRight,
  RiFilterLine,
  RiLayoutColumnLine,
  RiListCheck2,
  RiMenuLine,
} from "@remixicon/react";
import { useUrlSyncedState } from "@/lib/hooks/use-url-synced-state";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useColumnDragReorder } from "@/lib/hooks/use-column-drag-reorder";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { computeDefaultOrder, computeDefaultVisibility, getColumnId } from "./columns";
import { FilterDropdownContent } from "../common/filter-dropdown-content";
import { ColumnsDropdownContent } from "../common/columns-dropdown-content";

export interface TableFilter {
  label: string;
  options: string[];
  hiddenValues: string[];
  onToggle: (value: string, visible: boolean) => void;
  onSetAll: (visible: boolean) => void;
  renderOption?: (value: string) => React.ReactNode;
}

interface LogTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  defaultPageSize?: number;
  onRowClick?: (row: TData) => void;
  groupByKey?: string;
  groupByLabel?: string;
  filters?: TableFilter[];
  storageKey?: string;
}

export function LogTable<TData, TValue>({
  columns,
  data,
  defaultPageSize = 50,
  onRowClick,
  groupByKey,
  groupByLabel = "Service",
  filters = [],
  storageKey = "logs-table",
}: LogTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "timestamp", desc: true }]);
  const [columnVisibility, setColumnVisibility] = useUrlSyncedState<VisibilityState>(
    `${storageKey}.columnVisibility`,
    () => computeDefaultVisibility(columns)
  );
  const [columnOrder, setColumnOrder] = useUrlSyncedState<ColumnOrderState>(
    `${storageKey}.columnOrder`,
    () => computeDefaultOrder(columns)
  );
  const [isGrouped, setIsGrouped] = useUrlSyncedState<boolean>(`${storageKey}.isGrouped`, false);
  const [collapsedGroupIds, setCollapsedGroupIds] = useUrlSyncedState<string[]>(
    `${storageKey}.collapsedGroups`,
    []
  );
  const collapsedGroups = useMemo(() => new Set(collapsedGroupIds), [collapsedGroupIds]);
  const hydrated = useHydrated();

  // Reconcile persisted settings with the current column set: keep stored
  // choices for columns that still exist, default any newly-seen columns
  // (e.g. attribute columns discovered from freshly-loaded data), and drop
  // settings for columns that no longer exist.
  useEffect(() => {
    setColumnVisibility((prev) => {
      const defaults = computeDefaultVisibility(columns);
      const next = { ...defaults, ...prev };
      Object.keys(next).forEach((id) => {
        if (!(id in defaults)) delete next[id];
      });
      return next;
    });
    setColumnOrder((prev) => {
      const ids = columns.map(getColumnId);
      const kept = prev.filter((id) => ids.includes(id));
      const missing = ids.filter((id) => !kept.includes(id));
      return [...kept, ...missing];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);

  // Drag-to-reorder columns
  const { dragOverColId, handleDragStart, handleDragOver, handleDrop, handleDragEnd } =
    useColumnDragReorder(setColumnOrder);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    state: { sorting, columnVisibility, columnOrder },
    initialState: { pagination: { pageSize: defaultPageSize } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const fromRow = pageIndex * pageSize + 1;
  const toRow = Math.min((pageIndex + 1) * pageSize, totalRows);
  const hideableColumns = table.getAllColumns().filter((col) => col.getCanHide());

  // Full sorted row set (bypasses pagination) — `getSortedRowModel` is
  // itself a memoized selector keyed on `[sorting, data]`, so this is a
  // referentially-stable array that only changes when the actual sort
  // order does, letting the `groups` memo below depend on it directly.
  const sortedRows = table.getSortedRowModel().rows;

  const groups = useMemo<[string, Row<TData>[]][] | null>(() => {
    if (!isGrouped || !groupByKey) return null;

    const map = new Map<string, Row<TData>[]>();

    sortedRows.forEach((row) => {
      const key = String((row.original as Record<string, unknown>)[groupByKey] || "(no service)");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [isGrouped, groupByKey, sortedRows]);

  function toggleGroup(name: string) {
    setCollapsedGroupIds((prev) =>
      prev.includes(name) ? prev.filter((id) => id !== name) : [...prev, name]
    );
  }

  const visibleColCount = table.getVisibleLeafColumns().length;

  // Persisted settings (column visibility/order, group mode) are only known
  // for certain once hydrated — render a placeholder instead of briefly
  // flashing the un-personalized defaults.
  if (!hydrated) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex-1 animate-pulse rounded-md border border-border bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {/* Group toggle */}
        {groupByKey && (
          <div className="flex items-center gap-1 rounded border border-border p-0.5">
            <button
              onClick={() => setIsGrouped(false)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
                !isGrouped
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <RiMenuLine className="size-3.5" />
              Flat
            </button>
            <button
              onClick={() => setIsGrouped(true)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
                isGrouped
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <RiListCheck2 className="size-3.5" />
              Group by {groupByLabel}
            </button>
          </div>
        )}

        {/* Filter dropdowns */}
        {filters.map((filter) => {
          const hiddenSet = new Set(filter.hiddenValues);
          const visibleCount = filter.options.length - hiddenSet.size;
          return (
            <DropdownMenu key={filter.label}>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                <RiFilterLine className="size-3.5" />
                {filter.label}
                <span className="rounded bg-muted px-1 font-mono text-[10px] font-medium text-foreground">
                  {hiddenSet.size > 0
                    ? `${visibleCount}/${filter.options.length}`
                    : filter.options.length}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-80 w-56 overflow-y-auto">
                <FilterDropdownContent filter={filter} />
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        {/* Column picker */}
        {hideableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-auto flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
              <RiLayoutColumnLine className="size-3.5" />
              Columns
              <span className="rounded bg-muted px-1 font-mono text-[10px] font-medium text-foreground">
                {(() => {
                  const visible = hideableColumns.filter((c) => c.getIsVisible()).length;
                  return visible > 0
                    ? `${visible}/${hideableColumns.length}`
                    : hideableColumns.length;
                })()}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
              <ColumnsDropdownContent hideableColumns={hideableColumns} table={table} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table — flex-1 so it fills remaining space, overflow-y-auto makes body scroll */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    draggable={!header.isPlaceholder}
                    onDragStart={() => handleDragStart(header.column.id)}
                    onDragOver={(e) => handleDragOver(e, header.column.id)}
                    onDrop={() => handleDrop(header.column.id)}
                    onDragEnd={handleDragEnd}
                    className={`cursor-grab select-none active:cursor-grabbing ${
                      dragOverColId === header.column.id ? "border-l-2 border-l-primary" : ""
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {/* ── Grouped view ── */}
            {groups ? (
              groups.length > 0 ? (
                groups.map(([service, rows]) => {
                  const collapsed = collapsedGroups.has(service);
                  return (
                    <React.Fragment key={`group-${service}`}>
                      {/* Group header */}
                      <TableRow
                        className="cursor-pointer bg-muted/20 hover:bg-muted/40"
                        onClick={() => toggleGroup(service)}
                      >
                        <TableCell colSpan={visibleColCount} className="py-2 font-medium">
                          <div className="flex items-center gap-2">
                            {collapsed ? (
                              <RiChevronRight className="size-3.5 text-muted-foreground" />
                            ) : (
                              <RiArrowDownSLine className="size-3.5 text-muted-foreground" />
                            )}
                            <span className="font-mono">{service}</span>
                            <span className="text-muted-foreground">({rows.length} logs)</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Group rows */}
                      {!collapsed &&
                        rows.map((row) => (
                          <TableRow
                            key={row.id}
                            onClick={() => onRowClick?.(row.original)}
                            className={onRowClick ? "cursor-pointer" : ""}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={visibleColCount}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No logs.
                  </TableCell>
                </TableRow>
              )
            ) : /* ── Flat view ── */
            table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? "cursor-pointer" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  No logs.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination — only in flat mode */}
      {!isGrouped && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>{totalRows > 0 ? `${fromRow}–${toRow} of ${totalRows} logs` : "0 logs"}</span>

          <div className="flex items-center gap-1">
            <button
              className="flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <RiArrowLeftSLine className="size-3" />
              Previous
            </button>

            <span className="px-2">
              Page {pageIndex + 1} of {table.getPageCount()}
            </span>

            <button
              className="flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <RiArrowRightSLine className="size-3" />
            </button>
          </div>
        </div>
      )}

      {isGrouped && groups && (
        <p className="px-1 text-xs text-muted-foreground">
          {groups.length} services · {totalRows} logs
        </p>
      )}
    </div>
  );
}
