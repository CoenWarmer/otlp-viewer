"use client";

import { useEffect, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchLogs, logsQueryKey } from "@/lib/queries/logs";
import {
  collectAttributeKeys,
  flattenLogs,
  severityColorClass,
  type LogRow,
} from "@/lib/utils/otlp";
import { SeverityNumber } from "@/lib/types/otlp";
import { serviceColor } from "@/lib/utils/histogram";
import { useUrlSyncedState } from "@/lib/hooks/use-url-synced-state";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { columns, createAttributeColumn } from "./logs/columns";
import { LogTable, type TableFilter } from "./logs/log-table";
import { Badge } from "@/components/ui/badge";
import { RiCloseLine, RiRefreshLine } from "@remixicon/react";
import { LogDrawer } from "./logs/log-drawer";
import { LogVolumeChart } from "./logs/log-volume-chart";
import type { TimeRange } from "@/lib/types/common";

const SERVICE_KEY = "serviceName";

export default function LogsView() {
  const { data, refetch, isFetching } = useSuspenseQuery({
    queryKey: logsQueryKey,
    queryFn: fetchLogs,
  });
  const rows = useMemo(() => flattenLogs(data), [data]);

  // ── Service filter ──────────────────────────────────────────────────────
  const [hiddenServices, setHiddenServices] = useUrlSyncedState<string[]>(
    "logs-view.hiddenServices",
    []
  );
  const availableServices = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => set.add(row.serviceName || "(no service)"));
    return Array.from(set).sort();
  }, [rows]);

  // The API returns a randomized set of services per request, so a refresh
  // can make previously-hidden services disappear entirely (or introduce new
  // ones). Drop hidden entries that no longer exist so the filter dropdown's
  // "visible/total" count reflects the services actually present, rather
  // than staying stuck subtracting stale, now-nonexistent names.
  useEffect(() => {
    setHiddenServices((prev) => {
      const next = prev.filter((s) => availableServices.includes(s));
      return next.length === prev.length ? prev : next;
    });
  }, [availableServices, setHiddenServices]);

  const serviceColorMap = useMemo(() => {
    const map = new Map<string, string>();
    availableServices.forEach((s, i) => map.set(s, serviceColor(i)));
    return map;
  }, [availableServices]);

  const allColumns = useMemo(() => {
    const attributeKeys = collectAttributeKeys(rows);
    return [
      ...columns,
      ...attributeKeys.map((key) =>
        createAttributeColumn(key, key === "service.name" ? serviceColorMap : undefined)
      ),
    ];
  }, [rows, serviceColorMap]);

  // ── Severity filter ──────────────────────────────────────────────────────
  const [hiddenSeverities, setHiddenSeverities] = useUrlSyncedState<string[]>(
    "logs-view.hiddenSeverities",
    []
  );
  // Collect unique severities sorted by level (TRACE → FATAL)
  const availableSeverities = useMemo(() => {
    const map = new Map<string, SeverityNumber>();
    rows.forEach((row) => map.set(row.severityText, row.severityNumber));
    return Array.from(map.entries())
      .sort(([, a], [, b]) => a - b)
      .map(([text]) => text);
  }, [rows]);

  // Same reconciliation as services, in case a refresh changes which
  // severities are present.
  useEffect(() => {
    setHiddenSeverities((prev) => {
      const next = prev.filter((s) => availableSeverities.includes(s));
      return next.length === prev.length ? prev : next;
    });
  }, [availableSeverities, setHiddenSeverities]);

  // ── Filtered rows ────────────────────────────────────────────────────────
  const [timeRange, setTimeRange] = useUrlSyncedState<TimeRange | null>(
    "logs-view.timeRange",
    null
  );

  const visibleRows = useMemo(() => {
    const hiddenServiceSet = new Set(hiddenServices);
    const hiddenSeveritySet = new Set(hiddenSeverities);
    return rows.filter((row) => {
      if (hiddenServiceSet.size > 0 && hiddenServiceSet.has(row.serviceName || "(no service)"))
        return false;
      if (hiddenSeveritySet.size > 0 && hiddenSeveritySet.has(row.severityText)) return false;
      if (timeRange) {
        const t = row.timestamp.getTime();
        if (t < timeRange.start || t > timeRange.end) return false;
      }
      return true;
    });
  }, [rows, hiddenServices, hiddenSeverities, timeRange]);

  const filters = useMemo<TableFilter[]>(
    () => [
      {
        label: "Service",
        options: availableServices,
        hiddenValues: hiddenServices,
        onToggle: (value, visible) =>
          setHiddenServices((prev) =>
            visible ? prev.filter((s) => s !== value) : [...prev, value]
          ),
        onSetAll: (visible) => setHiddenServices(visible ? [] : [...availableServices]),
      },
      {
        label: "Severity",
        options: availableSeverities,
        hiddenValues: hiddenSeverities,
        onToggle: (value, visible) =>
          setHiddenSeverities((prev) =>
            visible ? prev.filter((s) => s !== value) : [...prev, value]
          ),
        onSetAll: (visible) => setHiddenSeverities(visible ? [] : [...availableSeverities]),
        renderOption: (value) => {
          const n =
            rows.find((r) => r.severityText === value)?.severityNumber ??
            SeverityNumber.SEVERITY_NUMBER_UNSPECIFIED;
          return <span className={`font-mono font-medium ${severityColorClass(n)}`}>{value}</span>;
        },
      },
    ],
    [
      availableServices,
      hiddenServices,
      setHiddenServices,
      availableSeverities,
      hiddenSeverities,
      setHiddenSeverities,
      rows,
    ]
  );

  const [selectedRow, setSelectedRow] = useState<LogRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleRowClick(row: LogRow) {
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  // Clicking a service name in the drawer closes it and filters the whole
  // view down to just that service.
  function handleServiceClick(service: string) {
    setHiddenServices(availableServices.filter((s) => s !== service));
    setDrawerOpen(false);
  }

  const isServiceFiltered = hiddenServices.length > 0;
  const visibleServices = useMemo(
    () => availableServices.filter((s) => !hiddenServices.includes(s)),
    [availableServices, hiddenServices]
  );

  // Service/severity filters and the selected time range may be restored
  // from a shared URL — render a placeholder until hydration settles so we
  // never flash the unfiltered view before snapping to the shared one.
  const hydrated = useHydrated();
  const header = (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-3xl font-bold text-foreground">OTLP Logs Viewer</h1>
      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="flex shrink-0 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RiRefreshLine className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="shrink-0" style={{ minHeight: 64 }}>
          {header}
          <div className="mt-2 h-5 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-40 shrink-0 animate-pulse rounded-md border border-border bg-muted/30" />
        <div className="min-h-0 flex-1 animate-pulse rounded-md border border-border bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0" style={{ minHeight: 64 }}>
        {header}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {isServiceFiltered ? (
            visibleServices.map((service) => (
              <Badge key={service} variant="secondary" className="gap-1 pr-1">
                {service}
                <button
                  aria-label={`Remove ${service} filter`}
                  className="rounded hover:text-foreground"
                  onClick={() => setHiddenServices((prev) => [...prev, service])}
                >
                  <RiCloseLine className="size-3" />
                </button>
              </Badge>
            ))
          ) : (
            <Badge variant="outline">All services ({availableServices.length})</Badge>
          )}
        </div>
      </div>
      <LogVolumeChart rows={visibleRows} selectedRange={timeRange} onRangeSelect={setTimeRange} />
      <LogTable
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
        serviceColorMap={serviceColorMap}
        onServiceClick={handleServiceClick}
      />
    </div>
  );
}
