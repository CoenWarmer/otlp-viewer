"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns `false` during SSR and the initial (hydrating) client render, then
 * flips to `true` once React has committed past hydration.
 *
 * Useful for gating UI that depends on client-only sources (e.g.
 * `localStorage`) so it renders a placeholder instead of briefly flashing
 * server/default content before the real client value is known.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
