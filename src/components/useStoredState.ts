"use client";

import { useCallback, useSyncExternalStore } from "react";

// localStorage is external to React. Reading it through
// useSyncExternalStore keeps render pure, avoids the
// setState-in-effect dance, and renders the fallback on the server so
// hydration matches.

const listeners = new Set<() => void>();
/** Fallback when storage throws, so the choice still sticks for this visit. */
const memory = new Map<string, string>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null; // Private mode or storage disabled.
  }
}

/** A string persisted in localStorage, shared by every reader of `key`. */
export function useStoredState(key: string, fallback: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback
  );

  const set = useCallback(
    (next: string) => {
      memory.set(key, next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // Storage unavailable — the choice just won't persist.
      }
      for (const listener of listeners) listener();
    },
    [key]
  );

  return [value, set] as const;
}
