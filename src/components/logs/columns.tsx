"use client";

import { ColumnDef, ColumnOrderState, Row, VisibilityState } from "@tanstack/react-table";
import { RiArrowDownLine, RiArrowUpDownLine, RiArrowUpLine } from "@remixicon/react";
import { type LogRow, severityColorClass } from "@/lib/utils/otlp";
import { SeverityNumber } from "@/lib/types/otlp";

/** Default columns */
export const columns: ColumnDef<LogRow>[] = [
  {
    accessorKey: "timestamp",
    sortingFn: sortByDate,
    header: ({ column }) => (
      <SortableHeader
        label="Time"
        isSorted={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => {
      const date: Date = row.getValue("timestamp");
      return (
        <span className="font-mono text-muted-foreground">
          {date.toISOString().replace("T", " ").slice(0, 23)}
        </span>
      );
    },
  },
  {
    accessorKey: "severityNumber",
    header: ({ column }) => (
      <SortableHeader
        label="Severity"
        isSorted={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => {
      const severityNumber: SeverityNumber = row.getValue("severityNumber");
      return (
        <span className={`font-mono font-medium ${severityColorClass(severityNumber)}`}>
          {row.original.severityText}
        </span>
      );
    },
  },
  {
    accessorKey: "body",
    header: "Body",
    cell: ({ row }) => <span className="block max-w-[600px] truncate">{row.getValue("body")}</span>,
  },
];

function SortableHeader({
  label,
  isSorted,
  onClick,
}: {
  label: string;
  isSorted: false | "asc" | "desc";
  onClick: () => void;
}) {
  // Neutral up/down icon (dimmed) when this isn't the active sort column;
  // an actual up/down arrow (full opacity) showing the direction when it is.
  const Icon =
    isSorted === "asc" ? RiArrowUpLine : isSorted === "desc" ? RiArrowDownLine : RiArrowUpDownLine;

  return (
    <button
      className="flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground"
      onClick={onClick}
    >
      {label}
      <Icon
        className={`size-3 cursor-pointer text-muted-foreground ${isSorted ? "opacity-100" : "opacity-50"}`}
      />
    </button>
  );
}

/** Creates a toggleable column for an attribute key (checks log attributes then resource attributes). */
export function createAttributeColumn(
  key: string,
  colorMap?: Map<string, string>
): ColumnDef<LogRow> {
  return {
    id: `attr:${key}`,
    header: ({ column }) => (
      <SortableHeader
        label={key}
        isSorted={column.getIsSorted()}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    enableHiding: true,
    cell: ({ row }) => {
      const val = row.original.attributes[key] ?? row.original.resourceAttributes[key];
      if (val === undefined || val === null)
        return <span className="text-muted-foreground">—</span>;
      const strVal = typeof val === "object" ? JSON.stringify(val) : String(val);
      const color = colorMap?.get(strVal);
      return (
        <span className="font-mono" style={color ? { color } : undefined}>
          {strVal}
        </span>
      );
    },
  };
}

export function computeDefaultVisibility<TData, TValue>(
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

export function computeDefaultOrder<TData, TValue>(
  columns: ColumnDef<TData, TValue>[]
): ColumnOrderState {
  return columns.map(getColumnId);
}

export function getColumnId<TData, TValue>(col: ColumnDef<TData, TValue>): string {
  return (
    (col as { id?: string }).id ?? String((col as { accessorKey?: unknown }).accessorKey ?? "")
  );
}

function sortByDate(rowA: Row<LogRow>, rowB: Row<LogRow>, columnId: string): number {
  return (
    (rowA.getValue<Date>(columnId)?.getTime() ?? 0) -
    (rowB.getValue<Date>(columnId)?.getTime() ?? 0)
  );
}
