"use client";

import { Bar, BarChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { LogRow } from "@/lib/utils/otlp";
import { formatTime } from "@/lib/utils/date";
import { TimeRange } from "@/lib/types/common";
import { useDragRangeSelection } from "@/lib/hooks/use-drag-range-selection";
import { useLogVolumeChartData } from "@/lib/hooks/use-log-volume-chart-data";

interface LogVolumeChartProps {
  rows: LogRow[];
  selectedRange?: TimeRange | null;
  onRangeSelect?: (range: TimeRange | null) => void;
}

const CHART_HEIGHT_CLASS = "h-28";

export function LogVolumeChart({ rows, selectedRange, onRangeSelect }: LogVolumeChartProps) {
  const { segmentBy, setSegmentBy, buckets, chartConfig, keys, totalLogs, bucketSize } =
    useLogVolumeChartData(rows);

  const { isDragging, refLeft, refRight, handleMouseDown, handleMouseMove, handleMouseUp } =
    useDragRangeSelection({ bucketSize, selectedRange, onRangeSelect });

  return (
    <div className="relative z-20 flex shrink-0 flex-col gap-2 rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Log Volume
          </h2>

          {selectedRange && !isDragging && (
            <button
              onClick={() => onRangeSelect?.(null)}
              className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {formatTime(selectedRange.start)} – {formatTime(selectedRange.end)}&nbsp;×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{totalLogs.toLocaleString()} logs</span>
          <div className="flex items-center gap-0.5 rounded border border-border p-0.5">
            {(["severity", "service"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSegmentBy(mode)}
                className={`rounded px-2 py-0.5 text-xs capitalize transition-colors ${
                  segmentBy === mode
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
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
          className={`aspect-auto ${CHART_HEIGHT_CLASS} w-full cursor-crosshair select-none`}
        >
          <BarChart
            data={buckets}
            margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />

            <XAxis
              dataKey="time"
              tickFormatter={(v) => formatTime(Number(v))}
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

            {!isDragging && (
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      // `label` (the formatter's first arg) resolves to the
                      // hovered series' config label here, not the axis
                      // value, since our x-axis is numeric rather than a
                      // config key — so pull the bucket's actual time from
                      // the payload data instead.
                      const time = (payload?.[0]?.payload as { time?: number } | undefined)?.time;
                      return typeof time === "number" ? formatTime(time) : "";
                    }}
                  />
                }
              />
            )}

            {keys.map((key) => (
              <Bar key={key} dataKey={key} stackId={segmentBy} fill={`var(--color-${key})`} />
            ))}

            {refLeft != null && refRight != null && refLeft !== refRight && (
              <ReferenceArea
                x1={refLeft}
                x2={refRight}
                fill="var(--color-primary)"
                fillOpacity={0.2}
                stroke="var(--color-primary)"
                strokeOpacity={0.5}
              />
            )}
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
