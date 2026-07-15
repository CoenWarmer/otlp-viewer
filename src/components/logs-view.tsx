"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchLogs, logsQueryKey } from "@/lib/queries/logs";
import { flattenLogs, type LogRow } from "@/lib/utils/otlp";
import { columns } from "./logs/columns";
import { DataTable } from "./logs/data-table";
import { LogDrawer } from "./logs/log-drawer";

export default function LogsView() {
  const { data } = useSuspenseQuery({ queryKey: logsQueryKey, queryFn: fetchLogs });
  const rows = flattenLogs(data);

  const [selectedRow, setSelectedRow] = useState<LogRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleRowClick(row: LogRow) {
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  return (
    <>
      <DataTable columns={columns} data={rows} onRowClick={handleRowClick} />
      <LogDrawer
        row={selectedRow}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
