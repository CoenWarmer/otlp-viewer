import {
  defaultShouldDehydrateQuery,
  environmentManager,
  QueryClient,
} from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, avoid refetching immediately on the client after hydration
        staleTime: 60 * 1000,
      },
      dehydrate: {
        // Stream pending queries to the client so Server Components can
        // kick off fetches without blocking rendering
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
        // Let Next.js handle error redaction — it does it with better digests
        shouldRedactErrors: () => false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (environmentManager.isServer()) {
    // Always create a fresh client per request on the server
    return makeQueryClient();
  }
  // Reuse the same client in the browser to avoid losing cache on re-renders
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
