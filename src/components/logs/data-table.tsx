"use client";

import {
  Column,
  ColumnDef,
  ColumnOrderState,
  Row,
  SortingState,
  Table as TanstackTable,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorageState } from "@/lib/hooks/use-local-storage-state";
import { useHydrated } from "@/lib/hooks/use-hydrated";
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
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
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

export interface TableFilter {
  label: string;
  options: string[];
  hiddenValues: string[];
  onToggle: (value: string, visible: boolean) => void;
  /** Called when the user clicks "All" — true = show all, false = hide all. */
  onSetAll: (visible: boolean) => void;
  /** Optional custom renderer for each option row in the dropdown. */
  renderOption?: (value: string) => React.ReactNode;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  defaultPageSize?: number;
  onRowClick?: (row: TData) => void;
  /** If provided, a "Group by …" toggle appears that groups rows by this key. */
  groupByKey?: string;
  groupByLabel?: string;
  /**
   * Filter dropdowns. Filtering is controlled by the caller so that other UI
   * (e.g. a chart) driven by the same source rows stays in sync with the table.
   */
  filters?: TableFilter[];
  /** Namespaces the localStorage keys used to persist column/grouping settings. */
  storageKey?: string;
}

// ── Searchable dropdown sub-components ──────────────────────────────────────

function SearchInput({
  value,
  onChange,
  onEnter,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="px-2 pb-1 pt-2">
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key !== "Escape") e.stopPropagation();
          if (e.key === "Enter") onEnter?.();
        }}
        className="w-full rounded border border-border bg-transparent px-2 py-1 text-xs outline-none placeholder:text-muted-foreground focus:border-ring"
      />
    </div>
  );
}

function FilterDropdownContent({ filter }: { filter: TableFilter }) {
  const [search, setSearch] = useState("");
  const hiddenSet = new Set(filter.hiddenValues);
  const filtered = search
    ? filter.options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : filter.options;

  return (
    <>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={`Search ${filter.label}…`}
        onEnter={() => {
          if (filtered.length === 1)
            filter.onToggle(filtered[0], hiddenSet.has(filtered[0]));
        }}
      />
      <DropdownMenuGroup>
        <DropdownMenuLabel>Filter by {filter.label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!search && (
          <>
            <div
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              onClick={() => filter.onSetAll(hiddenSet.size > 0)}
            >
              <Checkbox
                checked={
                  hiddenSet.size === 0 ? true
                  : hiddenSet.size === filter.options.length ? false
                  : "mixed"
                }
                className="pointer-events-none"
              />
              <span>All</span>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {filtered.map((value) => (
          <div
            key={value}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
            onClick={() => filter.onToggle(value, hiddenSet.has(value))}
          >
            <Checkbox checked={!hiddenSet.has(value)} className="pointer-events-none" />
            {filter.renderOption ? filter.renderOption(value) : <span className="font-mono">{value}</span>}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No results.</p>
        )}
      </DropdownMenuGroup>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ColumnsDropdownContent({ hideableColumns, table }: { hideableColumns: Column<any, any>[]; table: TanstackTable<any> }) {
  const [search, setSearch] = useState("");
  const getLabel = (col: Column<unknown, unknown>) =>
    col.id.startsWith("attr:") ? col.id.slice(5) : col.id;
  const filtered = search
    ? hideableColumns.filter((c) => getLabel(c).toLowerCase().includes(search.toLowerCase()))
    : hideableColumns;
  const visibleCount = hideableColumns.filter((c) => c.getIsVisible()).length;
  const allVisible = visibleCount === hideableColumns.length;
  const noneVisible = visibleCount === 0;

  return (
    <>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search columns…"
        onEnter={() => {
          if (filtered.length === 1)
            filtered[0].toggleVisibility(!filtered[0].getIsVisible());
        }}
      />
      <DropdownMenuGroup>
        <DropdownMenuLabel>Toggle attribute columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!search && (
          <>
            <div
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              onClick={() => table.toggleAllColumnsVisible(noneVisible)}
            >
              <Checkbox
                checked={allVisible ? true : noneVisible ? false : "mixed"}
                className="pointer-events-none"
              />
              <span>All</span>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {filtered.map((col) => (
          <div
            key={col.id}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
            onClick={() => col.toggleVisibility(!col.getIsVisible())}
          >
            <Checkbox checked={col.getIsVisible()} className="pointer-events-none" />
            <span className="font-mono">{getLabel(col)}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No results.</p>
        )}
      </DropdownMenuGroup>
    </>
  );
}

function getColumnId<TData, TValue>(col: ColumnDef<TData, TValue>): string {
  return (
    (col as { id?: string }).id ??
    String((col as { accessorKey?: unknown }).accessorKey ?? "")
  );
}

function computeDefaultVisibility<TData, TValue>(
  columns: ColumnDef<TData, TValue>[]
): VisibilityState {
  return Object.fromEntries(
    columns
      .filter((col) => col.enableHiding !== false)
      .map((col) => {
        const id = getColumnId(col);
        // Attribute columns start hidden; named columns start visible
        return [id, !id.startsWith("attr:")];
      })
  );
}

function computeDefaultOrder<TData, TValue>(
  columns: ColumnDef<TData, TValue>[]
): ColumnOrderState {
  return columns.map(getColumnId);
}

export function DataTable<TData, TValue>({
  columns,
  data,
  defaultPageSize = 50,
  onRowClick,
  groupByKey,
  groupByLabel = "Service",
  filters = [],
  storageKey = "logs-table",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] =
    useLocalStorageState<VisibilityState>(
      `${storageKey}.columnVisibility`,
      () => computeDefaultVisibility(columns)
    );
  const [columnOrder, setColumnOrder] = useLocalStorageState<ColumnOrderState>(
    `${storageKey}.columnOrder`,
    () => computeDefaultOrder(columns)
  );
  const [isGrouped, setIsGrouped] = useLocalStorageState<boolean>(
    `${storageKey}.isGrouped`,
    false
  );
  const [collapsedGroupIds, setCollapsedGroupIds] = useLocalStorageState<
    string[]
  >(`${storageKey}.collapsedGroups`, []);
  const collapsedGroups = useMemo(
    () => new Set(collapsedGroupIds),
    [collapsedGroupIds]
  );
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

  // Drag-to-reorder state
  const dragColId = useRef<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  function handleDragStart(colId: string) {
    dragColId.current = colId;
  }
  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    if (dragColId.current && dragColId.current !== colId) {
      setDragOverColId(colId);
    }
  }
  function handleDrop(targetColId: string) {
    const from = dragColId.current;
    if (!from || from === targetColId) return;
    setColumnOrder((prev) => {
      const order = [...prev];
      const fromIdx = order.indexOf(from);
      const toIdx = order.indexOf(targetColId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, from);
      return order;
    });
    dragColId.current = null;
    setDragOverColId(null);
  }
  function handleDragEnd() {
    dragColId.current = null;
    setDragOverColId(null);
  }

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

  // Build groups from the full sorted row set (bypasses pagination).
  // `table` is a stable, mutated-in-place ref returned by `useReactTable` — its
  // identity never changes, so we depend on `data`/`sorting` directly (the
  // actual inputs that affect the row set) rather than on `table` itself.
  const groups = useMemo<[string, Row<TData>[]][] | null>(() => {
    if (!isGrouped || !groupByKey) return null;
    const map = new Map<string, Row<TData>[]>();
    table.getSortedRowModel().rows.forEach((row) => {
      const key = String(
        (row.original as Record<string, unknown>)[groupByKey] || "(no service)"
      );
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGrouped, groupByKey, data, sorting]);

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
                      dragOverColId === header.column.id
                        ? "border-l-2 border-l-primary"
                        : ""
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                        <TableCell
                          colSpan={visibleColCount}
                          className="py-2 font-medium"
                        >
                          <div className="flex items-center gap-2">
                            {collapsed ? (
                              <RiChevronRight className="size-3.5 text-muted-foreground" />
                            ) : (
                              <RiArrowDownSLine className="size-3.5 text-muted-foreground" />
                            )}
                            <span className="font-mono">{service}</span>
                            <span className="text-muted-foreground">
                              ({rows.length} records)
                            </span>
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
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
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
                    No log records.
                  </TableCell>
                </TableRow>
              )
            ) : (
              /* ── Flat view ── */
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
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
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
                    No log records.
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination — only in flat mode */}
      {!isGrouped && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>
            {totalRows > 0
              ? `${fromRow}–${toRow} of ${totalRows} records`
              : "0 records"}
          </span>
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
          {groups.length} services · {totalRows} records
        </p>
      )}
    </div>
  );
}
