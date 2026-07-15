import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "./get-query-client";
import { fetchLogsServer, logsQueryKey } from "@/lib/queries/logs";
import LogsView from "@/components/logs-view";

export default function Home() {
  const queryClient = getQueryClient();
  queryClient.prefetchQuery({ queryKey: logsQueryKey, queryFn: fetchLogsServer });

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-3xl font-bold text-foreground">OTLP Logs Viewer</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense
          fallback={
            <div className="text-muted-foreground text-sm">Loading logs…</div>
          }
        >
          <LogsView />
        </Suspense>
      </HydrationBoundary>
    </main>
  );
}
