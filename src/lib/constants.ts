import type { ChartConfig } from "@/components/ui/chart";
import { SeverityNumber } from "@/lib/types/otlp";

export const SEVERITY_GROUPS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

export type SeverityGroup = (typeof SEVERITY_GROUPS)[number];

export function severityGroup(n: SeverityNumber): SeverityGroup {
  if (n >= SeverityNumber.SEVERITY_NUMBER_FATAL) {
    return "fatal";
  }
  if (n >= SeverityNumber.SEVERITY_NUMBER_ERROR) {
    return "error";
  }
  if (n >= SeverityNumber.SEVERITY_NUMBER_WARN) {
    return "warn";
  }
  if (n >= SeverityNumber.SEVERITY_NUMBER_INFO) {
    return "info";
  }
  if (n >= SeverityNumber.SEVERITY_NUMBER_DEBUG) {
    return "debug";
  }
  return "trace";
}

/**
 * Single source of truth for "severity group → color", shared by the plain
 * text UI (table/drawer, via `textClass`; see `severityColorClass` in
 * src/lib/utils/otlp.ts) and the volume chart's `SEVERITY_CONFIG` below (via
 * `chartColor`). Both point at the *same* Tailwind color token — `chartColor`
 * is a CSS variable reference (e.g. `var(--color-red-400)`) rather than a
 * hardcoded hex value — so the two can never visually drift apart, and both
 * stay theme-aware (`trace` follows `--color-muted-foreground`, which
 * changes between light/dark).
 */
export const SEVERITY_COLORS: Record<
  SeverityGroup,
  { label: string; textClass: string; chartColor: string }
> = {
  trace: {
    label: "Trace",
    textClass: "text-muted-foreground",
    chartColor: "var(--color-muted-foreground)",
  },
  debug: { label: "Debug", textClass: "text-blue-400", chartColor: "var(--color-blue-400)" },
  info: { label: "Info", textClass: "text-green-400", chartColor: "var(--color-green-400)" },
  warn: { label: "Warn", textClass: "text-yellow-400", chartColor: "var(--color-yellow-400)" },
  error: { label: "Error", textClass: "text-red-400", chartColor: "var(--color-red-400)" },
  fatal: { label: "Fatal", textClass: "text-purple-400", chartColor: "var(--color-purple-400)" },
};

export const SEVERITY_CONFIG: ChartConfig = Object.fromEntries(
  SEVERITY_GROUPS.map((group) => [
    group,
    { label: SEVERITY_COLORS[group].label, color: SEVERITY_COLORS[group].chartColor },
  ])
);

// Used for the "segment by service" chart mode, where each service gets a
// distinct, arbitrary color (unlike severities, there's no fixed palette to
// match elsewhere in the UI, so these are just hardcoded here).
export const SERVICE_PALETTE = [
  "#818cf8",
  "#2dd4bf",
  "#fb923c",
  "#f472b6",
  "#a3e635",
  "#22d3ee",
  "#e879f9",
  "#34d399",
  "#fb7185",
  "#a78bfa",
  "#fcd34d",
  "#6ee7b7",
  "#7dd3fc",
  "#d8b4fe",
];
