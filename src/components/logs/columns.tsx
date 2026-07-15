"use client";

import { ColumnDef, SortingFn } from "@tanstack/react-table";
import { RiArrowUpDownLine } from "@remixicon/react";
import { type LogRow, severityColorClass } from "@/lib/utils/otlp";
import { SeverityNumber } from "@/lib/types/otlp";

const sortByDate: SortingFn<LogRow> = (rowA, rowB, columnId) =>
  (rowA.getValue<Date>(columnId)?.getTime() ?? 0) -
  (rowB.getValue<Date>(columnId)?.getTime() ?? 0);

function SortableHeader({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={onClick}
    >
      {label}
      <RiArrowUpDownLine className="size-3 text-muted-foreground" />
    </button>
  );
}

/** Fixed columns — always visible, cannot be hidden. */
export const columns: ColumnDef<LogRow>[] = [
  {
    accessorKey: "timestamp",
    enableHiding: false,
    sortingFn: sortByDate,
    header: ({ column }) => (
      <SortableHeader
        label="Time"
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
    enableHiding: false,
    header: ({ column }) => (
      <SortableHeader
        label="Severity"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => {
      const n: SeverityNumber = row.getValue("severityNumber");
      return (
        <span className={`font-mono font-medium ${severityColorClass(n)}`}>
          {row.original.severityText}
        </span>
      );
    },
  },
  {
    accessorKey: "body",
    enableHiding: false,
    header: "Body",
    cell: ({ row }) => (
      <span className="block max-w-[600px] truncate">
        {row.getValue("body")}
      </span>
    ),
  },
];

/** Creates a toggleable column for a log record attribute key. */
export function createAttributeColumn(key: string): ColumnDef<LogRow> {
  return {
    id: `attr:${key}`,
    header: key,
    enableHiding: true,
    cell: ({ row }) => {
      const val = row.original.attributes[key];
      if (val === undefined || val === null)
        return <span className="text-muted-foreground">—</span>;
      return (
        <span className="font-mono">
          {typeof val === "object" ? JSON.stringify(val) : String(val)}
        </span>
      );
    },
  };
}
