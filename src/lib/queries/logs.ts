import type { OtlpJsonLogsData } from "@/lib/types/otlp";

export const logsQueryKey = ["logs"] as const;

/** Used in client components — calls the Next.js proxy route. */
export async function fetchLogs(): Promise<OtlpJsonLogsData> {
  const res = await fetch("/api/logs");
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.statusText}`);
  return res.json();
}

/**
 * Used in Server Components for prefetching — calls the upstream API directly
 * since relative URLs don't work in the Node.js server environment.
 */
export async function fetchLogsServer(): Promise<OtlpJsonLogsData> {
  const url = process.env.LOGS_API_URL;
  if (!url) throw new Error("LOGS_API_URL is not set");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.statusText}`);
  return res.json();
}
