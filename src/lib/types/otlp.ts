/**
 * OTLP JSON/HTTP log types.
 *
 * Structural types (ResourceLogs, ScopeLogs, LogRecord, etc.) are derived from
 * the official proto spec via ts-proto — regenerate with: npm run generate:types
 *
 * AnyValue and KeyValue are defined manually because ts-proto generates a
 * discriminated union for the proto `oneof value` field, but the OTLP/JSON wire
 * format uses plain optional fields (e.g. `{"stringValue": "foo"}`), which is a
 * structural difference that ToOtlpJson<T> cannot bridge.
 *
 * Proto source: buf.build/opentelemetry/opentelemetry (opentelemetry/proto/logs/v1)
 */

import type {
  LogsData,
  LogRecord,
  ResourceLogs,
  ScopeLogs,
} from "../generated/opentelemetry/proto/logs/v1/logs";
import type { Resource } from "../generated/opentelemetry/proto/resource/v1/resource";

export { SeverityNumber } from "../generated/opentelemetry/proto/logs/v1/logs";

// ---------------------------------------------------------------------------
// AnyValue — flat optional fields matching the OTLP/JSON wire format
// ---------------------------------------------------------------------------

export interface OtlpJsonAnyValue {
  stringValue?: string;
  boolValue?: boolean;
  /** int64 is serialised as a string in OTLP/JSON */
  intValue?: string;
  doubleValue?: number;
  arrayValue?: { values: OtlpJsonAnyValue[] };
  kvlistValue?: { values: OtlpJsonKeyValue[] };
  /** bytes are base64-encoded strings in OTLP/JSON */
  bytesValue?: string;
}

export interface OtlpJsonKeyValue {
  key: string;
  value?: OtlpJsonAnyValue;
}

// ---------------------------------------------------------------------------
// Structural types derived from generated proto types
// fixed64 fields are already `string` (ts-proto forceLong=string)
// bytes fields (traceId, spanId) → string via ToOtlpJson<T>
// AnyValue / KeyValue references are replaced with the JSON-correct versions above
// ---------------------------------------------------------------------------

type ToOtlpJson<T> = T extends Uint8Array
  ? string
  : T extends object
    ? { [K in keyof T]: ToOtlpJson<T[K]> }
    : T;

export type OtlpJsonResource = Omit<ToOtlpJson<Resource>, "attributes"> & {
  attributes: OtlpJsonKeyValue[];
};

export type OtlpJsonLogRecord = Omit<
  ToOtlpJson<LogRecord>,
  "body" | "attributes"
> & {
  body?: OtlpJsonAnyValue;
  attributes: OtlpJsonKeyValue[];
};

export type OtlpJsonScopeLogs = Omit<ToOtlpJson<ScopeLogs>, "logRecords"> & {
  logRecords?: OtlpJsonLogRecord[];
};

export type OtlpJsonResourceLogs = Omit<
  ToOtlpJson<ResourceLogs>,
  "resource" | "scopeLogs"
> & {
  resource?: OtlpJsonResource;
  scopeLogs: OtlpJsonScopeLogs[];
};

export type OtlpJsonLogsData = Omit<ToOtlpJson<LogsData>, "resourceLogs"> & {
  resourceLogs?: OtlpJsonResourceLogs[];
};
