"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { type LogRow, severityColorClass } from "@/lib/utils/otlp";
import { RiCloseLine } from "@remixicon/react";

interface LogDrawerProps {
  row: LogRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogDrawer({ row, open, onOpenChange }: LogDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="w-full overflow-y-auto sm:max-w-xl">
        <DrawerHeader className="flex flex-row items-start justify-between">
          <div className="flex flex-col gap-1">
            <DrawerTitle>Log Record</DrawerTitle>
            {row && (
              <p className="font-mono text-xs text-muted-foreground">
                {row.timestamp.toISOString().replace("T", " ").slice(0, 23)}
              </p>
            )}
          </div>
          <DrawerClose className="rounded p-1 hover:bg-muted">
            <RiCloseLine className="size-4 text-muted-foreground" />
          </DrawerClose>
        </DrawerHeader>

        {row && (
          <div className="flex flex-col gap-4 overflow-y-auto p-4">
            {/* Severity + service */}
            <Section title="Overview">
              <Field label="Severity">
                <span className={`font-mono font-medium ${severityColorClass(row.severityNumber)}`}>
                  {row.severityText}
                </span>
              </Field>
              <Field label="Service">
                <Mono>{row.serviceName || "—"}</Mono>
              </Field>
              <Field label="Scope">
                <Mono>{row.scopeName || "—"}</Mono>
              </Field>
            </Section>

            {/* Body */}
            <Section title="Message">
              <pre className="whitespace-pre-wrap break-all rounded bg-muted/50 p-3 font-mono text-xs text-foreground">
                {formatBody(row.body)}
              </pre>
            </Section>

            {/* Trace context */}
            {(row.traceId || row.spanId) && (
              <Section title="Trace Context">
                {row.traceId && (
                  <Field label="Trace ID">
                    <Mono>{row.traceId}</Mono>
                  </Field>
                )}
                {row.spanId && (
                  <Field label="Span ID">
                    <Mono>{row.spanId}</Mono>
                  </Field>
                )}
              </Section>
            )}

            {/* Log attributes */}
            {Object.keys(row.attributes).length > 0 && (
              <Section title="Attributes">
                <AttributeTable attrs={row.attributes} />
              </Section>
            )}

            {/* Resource attributes */}
            {Object.keys(row.resourceAttributes).length > 0 && (
              <Section title="Resource Attributes">
                <AttributeTable attrs={row.resourceAttributes} />
              </Section>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-xs text-foreground">{children}</span>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono">{children}</span>;
}

function formatBody(body: string): string {
  if (!body) return "—";
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function AttributeTable({ attrs }: { attrs: Record<string, unknown> }) {
  return (
    <div className="rounded border border-border">
      {Object.entries(attrs).map(([key, value], i, arr) => (
        <div
          key={key}
          className={`flex gap-2 px-3 py-1.5 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
        >
          <span className="w-48 shrink-0 font-mono text-muted-foreground">{key}</span>
          <span className="min-w-0 break-all font-mono text-foreground">
            {typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
          </span>
        </div>
      ))}
    </div>
  );
}
