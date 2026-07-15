import { SeverityNumber } from "@/lib/types/otlp";
import type { LogRow } from "./otlp";

export const SEVERITY_GROUPS = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
] as const;

export type SeverityGroup = (typeof SEVERITY_GROUPS)[number];

export type LogVolumeBucket = { time: number; total: number } & Record<
  SeverityGroup,
  number
>;

function severityGroup(n: SeverityNumber): SeverityGroup {
  if (n >= SeverityNumber.SEVERITY_NUMBER_FATAL) return "fatal";
  if (n >= SeverityNumber.SEVERITY_NUMBER_ERROR) return "error";
  if (n >= SeverityNumber.SEVERITY_NUMBER_WARN) return "warn";
  if (n >= SeverityNumber.SEVERITY_NUMBER_INFO) return "info";
  if (n >= SeverityNumber.SEVERITY_NUMBER_DEBUG) return "debug";
  return "trace";
}

/**
 * Buckets log records into `bucketCount` equal-width time windows spanning
 * the data's min/max timestamp, tallying counts per severity group — ready
 * to render as a stacked histogram of log volume over time.
 *
 * Records with no valid timestamp (e.g. missing `timeUnixNano`, which decodes
 * to the epoch) are excluded so they don't skew the time range.
 */
export function buildLogVolumeHistogram(
  rows: LogRow[],
  bucketCount = 40
): LogVolumeBucket[] {
  const times = rows.map((row) => row.timestamp.getTime()).filter((t) => t > 0);
  if (times.length === 0) return [];

  const min = Math.min(...times);
  const max = Math.max(...times);
  // Guard against a zero-width span (all logs in the same instant).
  const span = Math.max(max - min, 1000);
  const bucketSize = span / bucketCount;

  const buckets: LogVolumeBucket[] = Array.from(
    { length: bucketCount },
    (_, i) => {
      const bucket = { time: min + i * bucketSize, total: 0 } as LogVolumeBucket;
      for (const group of SEVERITY_GROUPS) bucket[group] = 0;
      return bucket;
    }
  );

  rows.forEach((row) => {
    const t = row.timestamp.getTime();
    if (t <= 0) return;
    const idx = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((t - min) / bucketSize))
    );
    const group = severityGroup(row.severityNumber);
    buckets[idx][group] += 1;
    buckets[idx].total += 1;
  });

  return buckets;
}
