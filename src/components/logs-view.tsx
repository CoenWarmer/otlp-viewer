"use client";

import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchLogs, logsQueryKey } from "@/lib/queries/logs";
import { collectAttributeKeys, flattenLogs, type LogRow } from "@/lib/utils/otlp";
import { columns, createAttributeColumn } from "./logs/columns";
import { DataTable } from "./logs/data-table";
import { LogDrawer } from "./logs/log-drawer";

export default function LogsView() {
  const { data } = useSuspenseQuery({ queryKey: logsQueryKey, queryFn: fetchLogs });
  const rows = useMemo(() => flattenLogs(data), [data]);

  const allColumns = useMemo(() => {
    const attributeKeys = collectAttributeKeys(rows);
    return [...columns, ...attributeKeys.map(createAttributeColumn)];
  }, [rows]);

  const [selectedRow, setSelectedRow] = useState<LogRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleRowClick(row: LogRow) {
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable
        columns={allColumns}
        data={rows}
        onRowClick={handleRowClick}
        groupByKey="serviceName"
        groupByLabel="Service"
      />
      <LogDrawer
        row={selectedRow}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
