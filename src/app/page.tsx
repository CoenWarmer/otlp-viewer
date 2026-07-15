import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "./get-query-client";
import { fetchLogsServer, logsQueryKey } from "@/lib/queries/logs";
import LogsView from "@/components/logs-view";

export default function Home() {
  const queryClient = getQueryClient();
  queryClient.prefetchQuery({ queryKey: logsQueryKey, queryFn: fetchLogsServer });

  return (
    <main className="flex h-dvh flex-col gap-4 overflow-hidden p-6">
      <h1 className="shrink-0 text-3xl font-bold text-foreground">OTLP Logs Viewer</h1>
      <div className="flex min-h-0 flex-1 flex-col">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <Suspense
            fallback={
              <div className="text-muted-foreground text-sm">Loading logs…</div>
            }
          >
            <LogsView />
          </Suspense>
        </HydrationBoundary>
      </div>
    </main>
  );
}
