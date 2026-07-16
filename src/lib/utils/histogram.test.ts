import { describe, expect, it } from "vitest";
import { buildLogVolumeHistogram, buildServiceHistogram, serviceColor } from "./histogram";
import type { LogRow } from "./otlp";
import { SeverityNumber } from "@/lib/types/otlp";
import { SERVICE_PALETTE, SEVERITY_GROUPS } from "@/lib/constants";

function makeRow(overrides: Partial<LogRow> = {}): LogRow {
  return {
    id: "0",
    timestamp: new Date("2024-01-01T00:00:00.000Z"),
    severityNumber: SeverityNumber.SEVERITY_NUMBER_INFO,
    severityText: "INFO",
    body: "",
    serviceName: "checkout",
    scopeName: "",
    traceId: "",
    spanId: "",
    attributes: {},
    resourceAttributes: {},
    ...overrides,
  };
}

describe("serviceColor", () => {
  it("returns a color from the palette for in-range indices", () => {
    expect(serviceColor(0)).toBe(SERVICE_PALETTE[0]);
    expect(serviceColor(1)).toBe(SERVICE_PALETTE[1]);
  });

  it("wraps around (modulo) for indices beyond the palette length", () => {
    expect(serviceColor(SERVICE_PALETTE.length)).toBe(SERVICE_PALETTE[0]);
    expect(serviceColor(SERVICE_PALETTE.length + 2)).toBe(SERVICE_PALETTE[2]);
  });
});

describe("buildServiceHistogram", () => {
  it("returns an empty array when there are no rows", () => {
    expect(buildServiceHistogram([], ["checkout"])).toEqual([]);
  });

  it("returns an empty array when no row has a valid (positive) timestamp", () => {
    const rows = [makeRow({ timestamp: new Date(0) })];
    expect(buildServiceHistogram(rows, ["checkout"])).toEqual([]);
  });

  it("zero-initializes every requested service in every bucket", () => {
    const rows = [makeRow()];
    const buckets = buildServiceHistogram(rows, ["checkout", "billing"], 5);

    expect(buckets).toHaveLength(5);
    for (const bucket of buckets) {
      expect(bucket).toHaveProperty("checkout");
      expect(bucket).toHaveProperty("billing");
      expect(bucket).toHaveProperty("total");
      expect(bucket).toHaveProperty("time");
    }
  });

  it("tallies rows into the correct bucket and service key, and totals correctly", () => {
    const start = new Date("2024-01-01T00:00:00.000Z").getTime();
    const end = start + 10_000; // 10s span
    const rows = [
      makeRow({ serviceName: "checkout", timestamp: new Date(start) }),
      makeRow({ serviceName: "checkout", timestamp: new Date(start) }),
      makeRow({ serviceName: "billing", timestamp: new Date(end) }),
    ];

    const buckets = buildServiceHistogram(rows, ["checkout", "billing"], 10);

    const totalAcrossBuckets = buckets.reduce((sum, b) => sum + b.total, 0);
    expect(totalAcrossBuckets).toBe(3);

    const checkoutTotal = buckets.reduce((sum, b) => sum + (b.checkout ?? 0), 0);
    const billingTotal = buckets.reduce((sum, b) => sum + (b.billing ?? 0), 0);
    expect(checkoutTotal).toBe(2);
    expect(billingTotal).toBe(1);

    // The two earliest rows should land in the first bucket.
    expect(buckets[0].checkout).toBe(2);
    // The last row (at the max timestamp) should land in the final bucket.
    expect(buckets[buckets.length - 1].billing).toBe(1);
  });

  it("falls back to '(no service)' (sanitized) for rows with no service name", () => {
    const rows = [makeRow({ serviceName: "" })];
    const buckets = buildServiceHistogram(rows, [], 3);

    const total = buckets.reduce((sum, b) => sum + b.total, 0);
    expect(total).toBe(1);
    const noServiceTotal = buckets.reduce((sum, b) => sum + (b["_no_service_"] ?? 0), 0);
    expect(noServiceTotal).toBe(1);
  });

  it("sanitizes service names so they're safe to use as object/CSS-variable keys", () => {
    const rows = [makeRow({ serviceName: "my.service name" })];
    const buckets = buildServiceHistogram(rows, ["my.service name"], 1);

    expect(buckets[0]).toHaveProperty("my_service_name");
    expect(buckets[0].my_service_name).toBe(1);
  });

  it("guards against a zero-width time span (all rows at the same instant)", () => {
    const rows = [makeRow(), makeRow(), makeRow()];
    expect(() => buildServiceHistogram(rows, ["checkout"], 5)).not.toThrow();
    const buckets = buildServiceHistogram(rows, ["checkout"], 5);
    expect(buckets.reduce((sum, b) => sum + b.total, 0)).toBe(3);
  });

  it("respects a custom bucketCount", () => {
    const buckets = buildServiceHistogram([makeRow()], ["checkout"], 7);
    expect(buckets).toHaveLength(7);
  });
});

describe("buildLogVolumeHistogram", () => {
  it("returns an empty array when there are no rows", () => {
    expect(buildLogVolumeHistogram([])).toEqual([]);
  });

  it("returns an empty array when no row has a valid (positive) timestamp", () => {
    const rows = [makeRow({ timestamp: new Date(0) })];
    expect(buildLogVolumeHistogram(rows)).toEqual([]);
  });

  it("zero-initializes every severity group in every bucket", () => {
    // With a single row, exactly one bucket/group combination is non-zero —
    // assert every group key is present with a numeric value everywhere
    // (rather than asserting `0` everywhere, which the row's own bucket
    // wouldn't satisfy).
    const buckets = buildLogVolumeHistogram([makeRow()], 4);
    expect(buckets).toHaveLength(4);
    for (const bucket of buckets) {
      for (const group of SEVERITY_GROUPS) {
        expect(typeof bucket[group]).toBe("number");
      }
    }
  });

  it("tallies rows into the correct severity group and totals correctly", () => {
    const start = new Date("2024-01-01T00:00:00.000Z").getTime();
    const end = start + 10_000;
    const rows = [
      makeRow({ severityNumber: SeverityNumber.SEVERITY_NUMBER_ERROR, timestamp: new Date(start) }),
      makeRow({ severityNumber: SeverityNumber.SEVERITY_NUMBER_INFO, timestamp: new Date(start) }),
      makeRow({ severityNumber: SeverityNumber.SEVERITY_NUMBER_FATAL, timestamp: new Date(end) }),
    ];

    const buckets = buildLogVolumeHistogram(rows, 10);

    expect(buckets.reduce((sum, b) => sum + b.total, 0)).toBe(3);
    expect(buckets.reduce((sum, b) => sum + b.error, 0)).toBe(1);
    expect(buckets.reduce((sum, b) => sum + b.info, 0)).toBe(1);
    expect(buckets.reduce((sum, b) => sum + b.fatal, 0)).toBe(1);
    expect(buckets[0].error).toBe(1);
    expect(buckets[0].info).toBe(1);
    expect(buckets[buckets.length - 1].fatal).toBe(1);
  });

  it("excludes rows with an invalid timestamp from the tallies but keeps valid ones", () => {
    const rows = [
      makeRow({ timestamp: new Date(0) }),
      makeRow({ severityNumber: SeverityNumber.SEVERITY_NUMBER_WARN }),
    ];
    const buckets = buildLogVolumeHistogram(rows, 5);
    expect(buckets.reduce((sum, b) => sum + b.total, 0)).toBe(1);
    expect(buckets.reduce((sum, b) => sum + b.warn, 0)).toBe(1);
  });

  it("guards against a zero-width time span (all rows at the same instant)", () => {
    const rows = [makeRow(), makeRow()];
    expect(() => buildLogVolumeHistogram(rows, 5)).not.toThrow();
    const buckets = buildLogVolumeHistogram(rows, 5);
    expect(buckets.reduce((sum, b) => sum + b.total, 0)).toBe(2);
  });

  it("respects a custom bucketCount", () => {
    const buckets = buildLogVolumeHistogram([makeRow()], 6);
    expect(buckets).toHaveLength(6);
  });
});
