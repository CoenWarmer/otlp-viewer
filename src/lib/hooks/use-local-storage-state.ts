"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

// localStorage's native "storage" event only fires in *other* tabs/windows,
// so writes dispatch this custom event to notify subscribers in the same tab.
const LOCAL_EVENT = "otlp-viewer:local-storage";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_EVENT, callback);
  };
}

function getSnapshot(key: string): string | null {
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
 * Like `useState`, but persists the value to `localStorage` under `key` and
 * stays in sync across components/tabs.
 *
 * Built on `useSyncExternalStore` (React's API for subscribing to external
 * mutable sources) rather than `useEffect` + `useState`: it reads a
 * consistent snapshot during SSR/hydration and updates to the real
 * `localStorage` value right after mount, without a manual effect-driven
 * `setState` call.
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T | (() => T)
) {
  const raw = useSyncExternalStore(
    subscribe,
    () => getSnapshot(key),
    () => null
  );

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
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Ignore write failures (e.g. storage disabled/full).
      }
      window.dispatchEvent(new Event(LOCAL_EVENT));
    },
    [key]
  );

  return [state, setState] as const;
}
