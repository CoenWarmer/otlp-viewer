import type { LogRow } from "./otlp";
import { SERVICE_PALETTE, severityGroup, SEVERITY_GROUPS, type SeverityGroup } from "../constants";

export type LogVolumeBucket = { time: number; total: number } & Record<SeverityGroup, number>;

export function serviceColor(index: number): string {
  return SERVICE_PALETTE[index % SERVICE_PALETTE.length];
}

export type ServiceBucket = { time: number; total: number } & Record<string, number>;

/**
 * Buckets log records into `bucketCount` equal-width time windows, tallying
 * counts per service name — ready to render as a stacked histogram by service.
 */
export function buildServiceHistogram(
  rows: LogRow[],
  services: string[],
  bucketCount = 40
): ServiceBucket[] {
  const times = rows.map((row) => row.timestamp.getTime()).filter((t) => t > 0);
  if (times.length === 0) return [];

  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(max - min, 1000);
  const bucketSize = span / bucketCount;

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");

  const buckets: ServiceBucket[] = Array.from({ length: bucketCount }, (_, i) => {
    const bucket: ServiceBucket = { time: min + i * bucketSize, total: 0 };
    for (const s of services) bucket[sanitize(s)] = 0;
    return bucket;
  });

  rows.forEach((row) => {
    const t = row.timestamp.getTime();
    if (t <= 0) return;
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((t - min) / bucketSize)));
    const key = sanitize(row.serviceName || "(no service)");
    buckets[idx][key] = (buckets[idx][key] ?? 0) + 1;
    buckets[idx].total += 1;
  });

  return buckets;
}

/**
 * Buckets log records into `bucketCount` equal-width time windows spanning
 * the data's min/max timestamp, tallying counts per severity group — ready
 * to render as a stacked histogram of log volume over time.
 *
 * Records with no valid timestamp (e.g. missing `timeUnixNano`, which decodes
 * to the epoch) are excluded so they don't skew the time range.
 */
export function buildLogVolumeHistogram(rows: LogRow[], bucketCount = 40): LogVolumeBucket[] {
  const times = rows.map((row) => row.timestamp.getTime()).filter((t) => t > 0);

  if (times.length === 0) {
    return [];
  }

  const min = Math.min(...times);
  const max = Math.max(...times);
  // Guard against a zero-width span (all logs in the same instant).
  const span = Math.max(max - min, 1000);
  const bucketSize = span / bucketCount;

  const buckets: LogVolumeBucket[] = Array.from({ length: bucketCount }, (_, i) => {
    const bucket = { time: min + i * bucketSize, total: 0 } as LogVolumeBucket;

    for (const group of SEVERITY_GROUPS) bucket[group] = 0;

    return bucket;
  });

  rows.forEach((row) => {
    const t = row.timestamp.getTime();

    if (t <= 0) return;

    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((t - min) / bucketSize)));

    const group = severityGroup(row.severityNumber);

    buckets[idx][group] += 1;
    buckets[idx].total += 1;
  });

  return buckets;
}
