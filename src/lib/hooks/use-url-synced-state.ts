"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

// localStorage's native "storage" event only fires in *other* tabs/windows,
// and URL changes made via `history.replaceState` don't fire any event at
// all — so writes dispatch this custom event to notify subscribers.
const LOCAL_EVENT = "otlp-viewer:url-synced-state";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("popstate", callback);
  window.addEventListener(LOCAL_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("popstate", callback);
    window.removeEventListener(LOCAL_EVENT, callback);
  };
}

/** URL query param takes precedence (so a shared link reproduces the view), falling back to localStorage. */
function getSnapshot(key: string): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(key);
    if (fromUrl !== null) return fromUrl;
  } catch {
    // Ignore malformed URL.
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getFallback<T>(defaultValue: T | (() => T)): T {
  return typeof defaultValue === "function"
    ? (defaultValue as () => T)()
    : defaultValue;
}

/**
 * Like `useLocalStorageState`, but also mirrors the value into a URL query
 * parameter (JSON-encoded, under `key`) so the current view can be shared
 * via link — anyone opening that URL sees the same settings.
 *
 * The URL takes precedence over localStorage when both are present (so
 * opening a shared link reproduces that view rather than the opener's own
 * saved settings), and every change updates both the URL and localStorage
 * so the settings keep persisting normally afterwards.
 *
 * Built on `useSyncExternalStore`, same as `useLocalStorageState`, so it
 * stays hydration-safe without any effect-driven `setState` call. URL
 * updates use `history.replaceState` (per Next.js's guidance for shallow,
 * non-navigating URL updates) rather than the router, so toggling a setting
 * never triggers a route re-fetch.
 */
export function useUrlSyncedState<T>(key: string, defaultValue: T | (() => T)) {
  const raw = useSyncExternalStore(subscribe, () => getSnapshot(key), () => null);

  // Held in a ref (rather than a `useCallback` dependency) so `setState`
  // stays referentially stable even when callers pass a fresh literal or
  // closure as `defaultValue` on every render (e.g. `[]` or `() => ...`) —
  // matching the stability callers expect from a normal `useState` setter.
  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  const state = useMemo<T>(() => {
    if (raw === null) return getFallback(defaultValueRef.current);
    try {
      return JSON.parse(raw) as T;
    } catch {
      return getFallback(defaultValueRef.current);
    }
  }, [raw]);

  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      const prevRaw = getSnapshot(key);
      const prev =
        prevRaw !== null
          ? (JSON.parse(prevRaw) as T)
          : getFallback(defaultValueRef.current);
      const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
      const json = JSON.stringify(next);
      try {
        window.localStorage.setItem(key, json);
      } catch {
        // Ignore write failures (e.g. storage disabled/full).
      }
      try {
        const params = new URLSearchParams(window.location.search);
        params.set(key, json);
        const query = params.toString();
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${query ? `?${query}` : ""}`
        );
      } catch {
        // Ignore write failures (e.g. resulting URL too long).
      }
      window.dispatchEvent(new Event(LOCAL_EVENT));
    },
    [key]
  );

  return [state, setState] as const;
}
