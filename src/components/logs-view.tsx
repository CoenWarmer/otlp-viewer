"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchLogs, logsQueryKey } from "@/lib/queries/logs";
import { flattenLogs } from "@/lib/utils/otlp";
import { columns } from "./logs/columns";
import { DataTable } from "./logs/data-table";

export default function LogsView() {
  const { data } = useSuspenseQuery({ queryKey: logsQueryKey, queryFn: fetchLogs });
  const rows = flattenLogs(data);

  return <DataTable columns={columns} data={rows} />;
}
