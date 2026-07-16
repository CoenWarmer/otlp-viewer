import type { OtlpJsonAnyValue, OtlpJsonKeyValue, OtlpJsonLogsData } from "@/lib/types/otlp";
import { SeverityNumber } from "@/lib/types/otlp";
import { severityGroup, SEVERITY_COLORS } from "@/lib/constants";

export type LogRow = {
  id: string;
  timestamp: Date;
  severityNumber: SeverityNumber;
  severityText: string;
  body: string;
  serviceName: string;
  scopeName: string;
  traceId: string;
  spanId: string;
  attributes: Record<string, unknown>;
  resourceAttributes: Record<string, unknown>;
};

export function flattenLogs(data: OtlpJsonLogsData): LogRow[] {
  let idx = 0;
  return (data.resourceLogs ?? []).flatMap((rl) => {
    const resourceAttributes = decodeAttributes(rl.resource?.attributes);
    const serviceName =
      typeof resourceAttributes["service.name"] === "string"
        ? (resourceAttributes["service.name"] as string)
        : "";

    return (rl.scopeLogs ?? []).flatMap((sl) => {
      const scopeName = sl.scope?.name ?? "";

      return (sl.logRecords ?? []).map((record) => ({
        id: String(idx++),
        timestamp: nanosToDate(record.timeUnixNano || record.observedTimeUnixNano),
        severityNumber: record.severityNumber ?? SeverityNumber.SEVERITY_NUMBER_UNSPECIFIED,
        severityText: record.severityText || severityLabel(record.severityNumber),
        body: anyValueToString(record.body),
        serviceName,
        scopeName,
        traceId: record.traceId ?? "",
        spanId: record.spanId ?? "",
        attributes: decodeAttributes(record.attributes),
        resourceAttributes,
      }));
    });
  });
}

function nanosToDate(nanoStr: string | undefined): Date {
  if (!nanoStr || nanoStr === "0") return new Date(0);
  try {
    // Use BigInt() constructor (not literal) to stay within ES2017 target
    const ms = Number(BigInt(nanoStr) / BigInt(1000000));
    return new Date(ms);
  } catch {
    return new Date(0);
  }
}

/**
 * Recursively decodes an OTLP AnyValue into a plain JS value.
 * Uses flat optional-field access matching the OTLP/JSON wire format.
 */
function decodeAnyValue(anyValue: OtlpJsonAnyValue | undefined): unknown {
  if (!anyValue) {
    return null;
  }
  if (anyValue.stringValue !== undefined) {
    return anyValue.stringValue;
  }
  if (anyValue.intValue !== undefined) {
    return anyValue.intValue;
  }
  if (anyValue.doubleValue !== undefined) {
    return anyValue.doubleValue;
  }
  if (anyValue.boolValue !== undefined) {
    return anyValue.boolValue;
  }
  if (anyValue.bytesValue !== undefined) {
    return anyValue.bytesValue;
  }
  if (anyValue.arrayValue) {
    return (anyValue.arrayValue.values ?? []).map((av) => decodeAnyValue(av));
  }
  if (anyValue.kvlistValue) {
    return Object.fromEntries(
      (anyValue.kvlistValue.values ?? []).map((kv) => [kv.key, decodeAnyValue(kv.value)])
    );
  }
  return null;
}

/** Decodes a KeyValue[] into a plain Record, fully resolving nested AnyValues. */
function decodeAttributes(attrs: OtlpJsonKeyValue[] | undefined): Record<string, unknown> {
  return Object.fromEntries((attrs ?? []).map((kv) => [kv.key, decodeAnyValue(kv.value)]));
}

/**
 * String-only rendering for scalar-ish fields like `body`, where the UI
 * wants a plain string rather than a decoded structure. Falls back to
 * JSON.stringify for arrays/kvlists so nested bodies still display sensibly.
 */
export function anyValueToString(anyValue: OtlpJsonAnyValue | undefined): string {
  const decoded = decodeAnyValue(anyValue);

  if (decoded === null || decoded === undefined) {
    return "";
  }
  if (typeof decoded === "string") {
    return decoded;
  }

  if (typeof decoded === "number" || typeof decoded === "boolean") {
    return String(decoded);
  }

  return JSON.stringify(decoded);
}

function severityLabel(severityNumber: SeverityNumber | undefined): string {
  if (!severityNumber) return "UNSPECIFIED";
  return severityGroup(severityNumber).toUpperCase();
}

/**
 * Returns a sorted, deduplicated list of all attribute keys found across all rows.
 * Scans both log record attributes and resource attributes.
 */
export function collectAttributeKeys(rows: LogRow[]): string[] {
  const keys = new Set<string>();

  rows.forEach((row) => {
    Object.keys(row.attributes).forEach((k) => keys.add(k));
    Object.keys(row.resourceAttributes).forEach((k) => keys.add(k));
  });

  return Array.from(keys).sort();
}

export function severityColorClass(n: SeverityNumber): string {
  return SEVERITY_COLORS[severityGroup(n)].textClass;
}
