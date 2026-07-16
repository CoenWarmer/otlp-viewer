import { describe, expect, it } from "vitest";
import {
  anyValueToString,
  collectAttributeKeys,
  flattenLogs,
  severityColorClass,
  type LogRow,
} from "./otlp";
import { SeverityNumber } from "@/lib/types/otlp";
import type { OtlpJsonAnyValue, OtlpJsonLogsData } from "@/lib/types/otlp";

/**
 * The generated `OtlpJson*` types (via ts-proto) mark several fields
 * required (e.g. `droppedAttributesCount`, `entityRefs`) that real OTLP/JSON
 * payloads omit in practice, and that `flattenLogs` never reads. The app
 * itself never hits this mismatch since `fetchLogs` casts `res.json()`
 * without validating it — this helper lets fixtures below only specify the
 * fields the parser actually cares about, matching that same reality.
 */
function logsData(data: object): OtlpJsonLogsData {
  return data as unknown as OtlpJsonLogsData;
}

describe("flattenLogs", () => {
  it("returns an empty array for empty/missing data", () => {
    expect(flattenLogs({})).toEqual([]);
    expect(flattenLogs({ resourceLogs: [] })).toEqual([]);
  });

  it("flattens resource/scope/record nesting into flat rows with incrementing ids", () => {
    const data = logsData({
      resourceLogs: [
        {
          resource: {
            attributes: [{ key: "service.name", value: { stringValue: "checkout" } }],
          },
          scopeLogs: [
            {
              scope: { name: "checkout.worker" },
              logRecords: [
                {
                  timeUnixNano: "1700000000000000000",
                  severityNumber: SeverityNumber.SEVERITY_NUMBER_ERROR,
                  severityText: "ERROR",
                  body: { stringValue: "payment failed" },
                  traceId: "trace-1",
                  spanId: "span-1",
                  attributes: [{ key: "retry", value: { boolValue: true } }],
                },
                {
                  timeUnixNano: "1700000001000000000",
                  severityNumber: SeverityNumber.SEVERITY_NUMBER_INFO,
                  severityText: "INFO",
                  body: { stringValue: "payment ok" },
                  attributes: [],
                },
              ],
            },
          ],
        },
      ],
    });

    const rows = flattenLogs(data);

    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe("0");
    expect(rows[1].id).toBe("1");
    expect(rows.every((r) => r.serviceName === "checkout")).toBe(true);
    expect(rows.every((r) => r.scopeName === "checkout.worker")).toBe(true);
    expect(rows[0]).toMatchObject({
      severityText: "ERROR",
      body: "payment failed",
      traceId: "trace-1",
      spanId: "span-1",
      attributes: { retry: true },
    });
  });

  it("assigns globally-incrementing ids across multiple resources/scopes", () => {
    const makeRecord = () => ({
      severityNumber: SeverityNumber.SEVERITY_NUMBER_INFO,
      severityText: "INFO",
    });
    const data = logsData({
      resourceLogs: [
        {
          resource: { attributes: [] },
          scopeLogs: [{ scope: {}, logRecords: [makeRecord(), makeRecord()] }],
        },
        {
          resource: { attributes: [] },
          scopeLogs: [
            { scope: {}, logRecords: [makeRecord()] },
            { scope: {}, logRecords: [makeRecord()] },
          ],
        },
      ],
    });

    const rows = flattenLogs(data);
    expect(rows.map((r) => r.id)).toEqual(["0", "1", "2", "3"]);
  });

  it("falls back to observedTimeUnixNano when timeUnixNano is missing", () => {
    const data = logsData({
      resourceLogs: [
        {
          resource: { attributes: [] },
          scopeLogs: [
            {
              scope: {},
              logRecords: [
                {
                  observedTimeUnixNano: "1700000000000000000",
                  severityNumber: SeverityNumber.SEVERITY_NUMBER_INFO,
                },
              ],
            },
          ],
        },
      ],
    });

    const [row] = flattenLogs(data);
    expect(row.timestamp.getTime()).toBe(1700000000000);
  });

  it("uses the epoch when both timestamp fields are missing/zero", () => {
    const data = logsData({
      resourceLogs: [
        {
          resource: { attributes: [] },
          scopeLogs: [
            {
              scope: {},
              logRecords: [{ timeUnixNano: "0", severityNumber: SeverityNumber.SEVERITY_NUMBER_INFO }],
            },
          ],
        },
      ],
    });

    const [row] = flattenLogs(data);
    expect(row.timestamp.getTime()).toBe(0);
  });

  it("derives severityText from severityNumber when severityText is absent", () => {
    const data = logsData({
      resourceLogs: [
        {
          resource: { attributes: [] },
          scopeLogs: [
            {
              scope: {},
              logRecords: [{ severityNumber: SeverityNumber.SEVERITY_NUMBER_WARN }],
            },
          ],
        },
      ],
    });

    const [row] = flattenLogs(data);
    expect(row.severityText).toBe("WARN");
  });

  it("defaults severityNumber to UNSPECIFIED when absent", () => {
    const data = logsData({
      resourceLogs: [
        { resource: { attributes: [] }, scopeLogs: [{ scope: {}, logRecords: [{}] }] },
      ],
    });

    const [row] = flattenLogs(data);
    expect(row.severityNumber).toBe(SeverityNumber.SEVERITY_NUMBER_UNSPECIFIED);
    expect(row.severityText).toBe("UNSPECIFIED");
  });

  it("decodes nested resource and log attributes", () => {
    const data = logsData({
      resourceLogs: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "api" } },
              { key: "region", value: { stringValue: "eu-west-1" } },
            ],
          },
          scopeLogs: [
            {
              scope: {},
              logRecords: [
                {
                  severityNumber: SeverityNumber.SEVERITY_NUMBER_INFO,
                  attributes: [
                    { key: "http.status_code", value: { intValue: "200" } },
                    { key: "tags", value: { arrayValue: { values: [{ stringValue: "a" }] } } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const [row] = flattenLogs(data);
    expect(row.resourceAttributes).toEqual({ "service.name": "api", region: "eu-west-1" });
    expect(row.attributes).toEqual({ "http.status_code": "200", tags: ["a"] });
  });

  it("defaults serviceName to an empty string when service.name is missing", () => {
    const data = logsData({
      resourceLogs: [
        {
          resource: { attributes: [] },
          scopeLogs: [{ scope: {}, logRecords: [{}] }],
        },
      ],
    });

    const [row] = flattenLogs(data);
    expect(row.serviceName).toBe("");
  });
});

describe("anyValueToString", () => {
  it("returns an empty string for undefined", () => {
    expect(anyValueToString(undefined)).toBe("");
  });

  it("returns string values as-is", () => {
    expect(anyValueToString({ stringValue: "hello" })).toBe("hello");
  });

  it("stringifies numbers and booleans", () => {
    expect(anyValueToString({ doubleValue: 3.14 })).toBe("3.14");
    expect(anyValueToString({ boolValue: true })).toBe("true");
  });

  it("returns int64 (OTLP/JSON string) values as-is", () => {
    expect(anyValueToString({ intValue: "42" })).toBe("42");
  });

  it("JSON-stringifies array values, recursively decoding entries", () => {
    const value: OtlpJsonAnyValue = {
      arrayValue: { values: [{ stringValue: "a" }, { doubleValue: 1 }, { boolValue: false }] },
    };
    expect(anyValueToString(value)).toBe(JSON.stringify(["a", 1, false]));
  });

  it("JSON-stringifies kvlist values, recursively decoding entries", () => {
    const value: OtlpJsonAnyValue = {
      kvlistValue: { values: [{ key: "a", value: { stringValue: "b" } }] },
    };
    expect(anyValueToString(value)).toBe(JSON.stringify({ a: "b" }));
  });

  it("returns an empty string when no recognized field is set", () => {
    expect(anyValueToString({})).toBe("");
  });
});

describe("collectAttributeKeys", () => {
  const baseRow: LogRow = {
    id: "0",
    timestamp: new Date(0),
    severityNumber: SeverityNumber.SEVERITY_NUMBER_INFO,
    severityText: "INFO",
    body: "",
    serviceName: "",
    scopeName: "",
    traceId: "",
    spanId: "",
    attributes: {},
    resourceAttributes: {},
  };

  it("returns an empty array for no rows", () => {
    expect(collectAttributeKeys([])).toEqual([]);
  });

  it("collects and sorts unique keys across attributes and resourceAttributes", () => {
    const rows: LogRow[] = [
      { ...baseRow, attributes: { zeta: 1, alpha: 2 }, resourceAttributes: { "service.name": "a" } },
      { ...baseRow, attributes: { alpha: 3 }, resourceAttributes: { region: "eu" } },
    ];

    expect(collectAttributeKeys(rows)).toEqual(["alpha", "region", "service.name", "zeta"]);
  });
});

describe("severityColorClass", () => {
  it.each([
    [SeverityNumber.SEVERITY_NUMBER_FATAL, "text-purple-400"],
    [SeverityNumber.SEVERITY_NUMBER_ERROR, "text-red-400"],
    [SeverityNumber.SEVERITY_NUMBER_WARN, "text-yellow-400"],
    [SeverityNumber.SEVERITY_NUMBER_INFO, "text-green-400"],
    [SeverityNumber.SEVERITY_NUMBER_DEBUG, "text-blue-400"],
    [SeverityNumber.SEVERITY_NUMBER_TRACE, "text-muted-foreground"],
    [SeverityNumber.SEVERITY_NUMBER_UNSPECIFIED, "text-muted-foreground"],
  ])("maps severity %i to %s", (severity, expected) => {
    expect(severityColorClass(severity)).toBe(expected);
  });

  it("treats the +1/+2/+3 severity variants the same as their base level", () => {
    expect(severityColorClass(SeverityNumber.SEVERITY_NUMBER_ERROR2)).toBe("text-red-400");
    expect(severityColorClass(SeverityNumber.SEVERITY_NUMBER_ERROR4)).toBe("text-red-400");
  });
});
