"use client";

import { ColumnDef, SortingFn } from "@tanstack/react-table";
import { RiArrowUpDownLine } from "@remixicon/react";
import { type LogRow, severityColorClass } from "@/lib/utils/otlp";
import { SeverityNumber } from "@/lib/types/otlp";

const sortByDate: SortingFn<LogRow> = (rowA, rowB, columnId) =>
  (rowA.getValue<Date>(columnId)?.getTime() ?? 0) - (rowB.getValue<Date>(columnId)?.getTime() ?? 0);

function SortableHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="flex items-center gap-1 transition-colors hover:text-foreground"
      onClick={onClick}
    >
      {label}
      <RiArrowUpDownLine className="size-3 text-muted-foreground" />
    </button>
  );
}

export const columns: ColumnDef<LogRow>[] = [
  {
    accessorKey: "timestamp",
    sortingFn: sortByDate,
    header: ({ column }) => (
      <SortableHeader
        label="Timestamp"
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
    accessorKey: "serviceName",
    header: "Service",
    cell: ({ row }) => <span className="font-mono">{row.getValue("serviceName")}</span>,
  },
  {
    accessorKey: "scopeName",
    header: "Scope",
    cell: ({ row }) => (
      <span className="font-mono text-muted-foreground">{row.getValue("scopeName")}</span>
    ),
  },
  {
    accessorKey: "body",
    header: "Message",
    cell: ({ row }) => <span className="block max-w-[600px] truncate">{row.getValue("body")}</span>,
  },
];
