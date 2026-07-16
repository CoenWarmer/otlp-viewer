"use client";

import { useMemo, useState } from "react";
import type { ChartConfig } from "@/components/ui/chart";
import { buildLogVolumeHistogram, buildServiceHistogram, serviceColor } from "@/lib/utils/histogram";
import type { LogRow } from "@/lib/utils/otlp";
import { SEVERITY_CONFIG, SEVERITY_GROUPS } from "@/lib/constants";

export type SegmentBy = "severity" | "service";

/** CSS variable names can't contain dots etc — sanitize to match what `Bar` uses. */
export const sanitizeKey = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");

/**
 * Prepares histogram buckets for the log volume chart, segmented either by
 * severity or by service, along with the chart config/series keys needed to
 * render them and a couple of derived summary values.
 */
export function useLogVolumeChartData(rows: LogRow[]) {
  const [segmentBy, setSegmentBy] = useState<SegmentBy>("severity");

  const services = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.serviceName || "(no service)"));
    return Array.from(set).sort();
  }, [rows]);

  const serviceConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    services.forEach((s, i) => {
      config[sanitizeKey(s)] = { label: s, color: serviceColor(i) };
    });
    return config;
  }, [services]);

  const severityBuckets = useMemo(
    () => (segmentBy === "severity" ? buildLogVolumeHistogram(rows) : []),
    [rows, segmentBy]
  );
  const serviceBuckets = useMemo(
    () => (segmentBy === "service" ? buildServiceHistogram(rows, services) : []),
    [rows, services, segmentBy]
  );

  const buckets = segmentBy === "severity" ? severityBuckets : serviceBuckets;
  const chartConfig = segmentBy === "severity" ? SEVERITY_CONFIG : serviceConfig;
  const keys = segmentBy === "severity" ? SEVERITY_GROUPS : services.map(sanitizeKey);
  const totalLogs = useMemo(
    () => buckets.reduce((sum, b) => sum + b.total, 0),
    [buckets]
  );
  const bucketSize = buckets.length > 1 ? buckets[1].time - buckets[0].time : 0;

  return {
    segmentBy,
    setSegmentBy,
    buckets,
    chartConfig,
    keys,
    totalLogs,
    bucketSize,
  };
}
