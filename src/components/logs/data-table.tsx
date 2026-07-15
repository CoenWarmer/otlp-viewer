"use client";

import {
  ColumnDef,
  Row,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React, { useMemo, useState } from "react";
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowRightSLine as RiChevronRight,
  RiLayoutColumnLine,
  RiListCheck2,
  RiMenuLine,
} from "@remixicon/react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  defaultPageSize?: number;
  onRowClick?: (row: TData) => void;
  /** If provided, a "Group by …" toggle appears that groups rows by this key. */
  groupByKey?: string;
  groupByLabel?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  defaultPageSize = 50,
  onRowClick,
  groupByKey,
  groupByLabel = "Service",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () =>
      Object.fromEntries(
        columns
          .filter((col) => col.enableHiding !== false)
          .map((col) => {
            const id =
              (col as { id?: string }).id ??
              (col as { accessorKey?: string }).accessorKey ??
              "";
            return [id, false];
          })
      )
  );
  const [isGrouped, setIsGrouped] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnVisibility },
    initialState: { pagination: { pageSize: defaultPageSize } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const fromRow = pageIndex * pageSize + 1;
  const toRow = Math.min((pageIndex + 1) * pageSize, totalRows);
  const hideableColumns = table.getAllColumns().filter((col) => col.getCanHide());

  // Build groups from the full sorted row set (bypasses pagination)
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
    return Array.from(map.entries());
  }, [isGrouped, groupByKey, table]);

  function toggleGroup(name: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  const visibleColCount = table.getVisibleLeafColumns().length;

  return (
    <div className="flex flex-col gap-2">
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

        {/* Column picker */}
        {hideableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-auto flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
              <RiLayoutColumnLine className="size-3.5" />
              Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Toggle attribute columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideableColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(checked) =>
                      col.toggleVisibility(!!checked)
                    }
                  >
                    {col.id.startsWith("attr:") ? col.id.slice(5) : col.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
