"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { buildLogVolumeHistogram, SEVERITY_GROUPS } from "@/lib/utils/histogram";
import type { LogRow } from "@/lib/utils/otlp";

const chartConfig: ChartConfig = {
  trace: { label: "Trace", color: "#9ca3af" },
  debug: { label: "Debug", color: "#60a5fa" },
  info: { label: "Info", color: "#4ade80" },
  warn: { label: "Warn", color: "#fbbf24" },
  error: { label: "Error", color: "#f87171" },
  fatal: { label: "Fatal", color: "#c084fc" },
};

function formatBucketTime(time: number): string {
  return new Date(time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Height of the chart area itself — kept as a constant so the empty-state
// placeholder below can reserve the exact same space and avoid a layout
// jump when there's no data to plot (e.g. every service gets deselected).
const CHART_HEIGHT_CLASS = "h-28";

export function LogVolumeChart({ rows }: { rows: LogRow[] }) {
  const buckets = useMemo(() => buildLogVolumeHistogram(rows), [rows]);
  const totalLogs = buckets.reduce((sum, bucket) => sum + bucket.total, 0);

  return (
    <div className="flex shrink-0 flex-col gap-1 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Log Volume
        </h2>
        <span className="text-xs text-muted-foreground">
          {totalLogs.toLocaleString()} records
        </span>
      </div>
      {buckets.length === 0 ? (
        <div
          className={`flex ${CHART_HEIGHT_CLASS} w-full items-center justify-center text-xs text-muted-foreground`}
        >
          No log data to display.
        </div>
      ) : (
        <ChartContainer
          config={chartConfig}
          className={`aspect-auto ${CHART_HEIGHT_CLASS} w-full`}
        >
          <BarChart data={buckets} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickFormatter={(value) => formatBucketTime(Number(value))}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
              fontSize={11}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={28}
              allowDecimals={false}
              fontSize={11}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatBucketTime(Number(value))}
                />
              }
            />
            {SEVERITY_GROUPS.map((group) => (
              <Bar
                key={group}
                dataKey={group}
                stackId="severity"
                fill={`var(--color-${group})`}
              />
            ))}
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
