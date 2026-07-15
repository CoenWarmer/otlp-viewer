"use client";

import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
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
import { RiArrowLeftSLine, RiArrowRightSLine, RiLayoutColumnLine } from "@remixicon/react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  defaultPageSize?: number;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  defaultPageSize = 50,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);

  // All hideable columns start hidden; user opts in via the picker
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () =>
      Object.fromEntries(
        columns
          .filter((col) => col.enableHiding !== false)
          .map((col) => {
            const id = (col as { id?: string; accessorKey?: string }).id ??
              (col as { accessorKey?: string }).accessorKey ?? "";
            return [id, false];
          })
      )
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

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      {hideableColumns.length > 0 && (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
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
                    onCheckedChange={(checked) => col.toggleVisibility(!!checked)}
                  >
                    {col.id.startsWith("attr:") ? col.id.slice(5) : col.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

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
            {table.getRowModel().rows.length ? (
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
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No log records.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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
    </div>
  );
}
