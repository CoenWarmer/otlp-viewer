import type { LogRow } from "./otlp";
import { SERVICE_PALETTE, severityGroup, SEVERITY_GROUPS, type SeverityGroup } from "../constants";

export type LogVolumeBucket = { time: number; total: number } & Record<SeverityGroup, number>;

export function serviceColor(index: number): string {
  return SERVICE_PALETTE[index % SERVICE_PALETTE.length];
}

export type ServiceBucket = { time: number; total: number } & Record<string, number>;

type TimeBucket = { time: number; total: number } & Record<string, number>;

/**
 * Shared bucketing algorithm behind both histogram builders below: splits
 * `rows` into `bucketCount` equal-width time windows (spanning the data's
 * min/max timestamp) and tallies a count per category, where `categoryKey`
 * derives each row's category and `categories` lists every category to
 * zero-initialize (so a bucket with no matching rows still reports 0 for it,
 * rather than the key being absent).
 *
 * Records with no valid timestamp (e.g. missing `timeUnixNano`, which decodes
 * to the epoch) are excluded so they don't skew the time range.
 */
function buildTimeBuckets(
  rows: LogRow[],
  categories: string[],
  categoryKey: (row: LogRow) => string,
  bucketCount: number
): TimeBucket[] {
  const times = rows.map((row) => row.timestamp.getTime()).filter((t) => t > 0);
  if (times.length === 0) return [];

  const min = Math.min(...times);
  const max = Math.max(...times);
  // Guard against a zero-width span (all logs in the same instant).
  const span = Math.max(max - min, 1000);
  const bucketSize = span / bucketCount;

  const buckets: TimeBucket[] = Array.from({ length: bucketCount }, (_, i) => {
    const bucket: TimeBucket = { time: min + i * bucketSize, total: 0 };
    for (const category of categories) bucket[category] = 0;
    return bucket;
  });

  rows.forEach((row) => {
    const t = row.timestamp.getTime();
    if (t <= 0) return;
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((t - min) / bucketSize)));
    const key = categoryKey(row);
    buckets[idx][key] = (buckets[idx][key] ?? 0) + 1;
    buckets[idx].total += 1;
  });

  return buckets;
}

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");

/**
 * Buckets log records into `bucketCount` equal-width time windows, tallying
 * counts per service name — ready to render as a stacked histogram by service.
 */
export function buildServiceHistogram(
  rows: LogRow[],
  services: string[],
  bucketCount = 40
): ServiceBucket[] {
  return buildTimeBuckets(
    rows,
    services.map(sanitize),
    (row) => sanitize(row.serviceName || "(no service)"),
    bucketCount
  ) as ServiceBucket[];
}

/**
 * Buckets log records into `bucketCount` equal-width time windows spanning
 * the data's min/max timestamp, tallying counts per severity group — ready
 * to render as a stacked histogram of log volume over time.
 */
export function buildLogVolumeHistogram(rows: LogRow[], bucketCount = 40): LogVolumeBucket[] {
  return buildTimeBuckets(
    rows,
    [...SEVERITY_GROUPS],
    (row) => severityGroup(row.severityNumber),
    bucketCount
  ) as LogVolumeBucket[];
}
