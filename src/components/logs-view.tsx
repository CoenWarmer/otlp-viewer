"use client";

import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchLogs, logsQueryKey } from "@/lib/queries/logs";
import {
  collectAttributeKeys,
  flattenLogs,
  severityColorClass,
  type LogRow,
} from "@/lib/utils/otlp";
import { SeverityNumber } from "@/lib/types/otlp";
import { columns, createAttributeColumn } from "./logs/columns";
import { DataTable, type TableFilter } from "./logs/data-table";
import { Badge } from "@/components/ui/badge";
import { RiCloseLine } from "@remixicon/react";
import { LogDrawer } from "./logs/log-drawer";
import { LogVolumeChart } from "./logs/log-volume-chart";

const SERVICE_KEY = "serviceName";

export default function LogsView() {
  const { data } = useSuspenseQuery({ queryKey: logsQueryKey, queryFn: fetchLogs });
  const rows = useMemo(() => flattenLogs(data), [data]);

  const allColumns = useMemo(() => {
    const attributeKeys = collectAttributeKeys(rows);
    return [...columns, ...attributeKeys.map(createAttributeColumn)];
  }, [rows]);

  // Owned here (rather than inside DataTable) so the service filter can
  // drive both the table and the log volume chart from the same rows.
  // ── Service filter ──────────────────────────────────────────────────────
  const [hiddenServices, setHiddenServices] = useState<string[]>([]);
  const availableServices = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => set.add(row.serviceName || "(no service)"));
    return Array.from(set).sort();
  }, [rows]);

  // ── Severity filter ──────────────────────────────────────────────────────
  const [hiddenSeverities, setHiddenSeverities] = useState<string[]>([]);
  // Collect unique severities sorted by level (TRACE → FATAL)
  const availableSeverities = useMemo(() => {
    const map = new Map<string, SeverityNumber>();
    rows.forEach((row) => map.set(row.severityText, row.severityNumber));
    return Array.from(map.entries())
      .sort(([, a], [, b]) => a - b)
      .map(([text]) => text);
  }, [rows]);

  // ── Filtered rows ────────────────────────────────────────────────────────
  const visibleRows = useMemo(() => {
    const hiddenServiceSet = new Set(hiddenServices);
    const hiddenSeveritySet = new Set(hiddenSeverities);
    return rows.filter((row) => {
      if (hiddenServiceSet.size > 0 && hiddenServiceSet.has(row.serviceName || "(no service)")) return false;
      if (hiddenSeveritySet.size > 0 && hiddenSeveritySet.has(row.severityText)) return false;
      return true;
    });
  }, [rows, hiddenServices, hiddenSeverities]);

  const filters = useMemo<TableFilter[]>(() => [
    {
      label: "Service",
      options: availableServices,
      hiddenValues: hiddenServices,
      onToggle: (value, visible) =>
        setHiddenServices((prev) =>
          visible ? prev.filter((s) => s !== value) : [...prev, value]
        ),
      onSetAll: (visible) =>
        setHiddenServices(visible ? [] : [...availableServices]),
    },
    {
      label: "Severity",
      options: availableSeverities,
      hiddenValues: hiddenSeverities,
      onToggle: (value, visible) =>
        setHiddenSeverities((prev) =>
          visible ? prev.filter((s) => s !== value) : [...prev, value]
        ),
      onSetAll: (visible) =>
        setHiddenSeverities(visible ? [] : [...availableSeverities]),
      renderOption: (value) => {
        const n = rows.find((r) => r.severityText === value)?.severityNumber
          ?? SeverityNumber.SEVERITY_NUMBER_UNSPECIFIED;
        return (
          <span className={`font-mono font-medium ${severityColorClass(n)}`}>
            {value}
          </span>
        );
      },
    },
  ], [availableServices, hiddenServices, availableSeverities, hiddenSeverities, rows]);

  const [selectedRow, setSelectedRow] = useState<LogRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleRowClick(row: LogRow) {
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  const isServiceFiltered = hiddenServices.length > 0;
  const visibleServices = useMemo(
    () => availableServices.filter((s) => !hiddenServices.includes(s)),
    [availableServices, hiddenServices]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-3xl font-bold text-foreground">OTLP Logs Viewer</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {isServiceFiltered ? (
            visibleServices.map((service) => (
              <Badge key={service} variant="secondary" className="gap-1 pr-1">
                {service}
                <button
                  aria-label={`Remove ${service} filter`}
                  className="rounded hover:text-foreground"
                  onClick={() =>
                    setHiddenServices((prev) => [...prev, service])
                  }
                >
                  <RiCloseLine className="size-3" />
                </button>
              </Badge>
            ))
          ) : (
            <Badge variant="outline">
              All services ({availableServices.length})
            </Badge>
          )}
        </div>
      </div>
      <LogVolumeChart
        rows={visibleRows}
        selectedRange={timeRange}
        onRangeSelect={setTimeRange}
      />
      <DataTable
        columns={allColumns}
        data={visibleRows}
        onRowClick={handleRowClick}
        groupByKey={SERVICE_KEY}
        groupByLabel="Service"
        filters={filters}
      />
      <LogDrawer
        row={selectedRow}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
