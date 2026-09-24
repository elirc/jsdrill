"use client";

import { useCallback, useEffect, useState } from "react";

export type ApiError = {
  /** HTTP status, or 0 when the request never got a response. */
  status: number;
  message: string;
};

type Loaded<T> = { key: string; data: T | null; error: ApiError | null };

/**
 * GET a `{ success, data }` endpoint.
 *
 * State is only ever set from the fetch's promise callbacks (never
 * synchronously in the effect body), and each result is tagged with the
 * request it answers — so a slow response for an old URL can't land on
 * a newer one, and "loading" is derived rather than stored.
 */
export function useApi<T>(url: string | null) {
  const [nonce, setNonce] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const key = url ? `${url}#${nonce}` : "";

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (json?.success) {
          setLoaded({ key, data: json.data as T, error: null });
        } else {
          setLoaded({
            key,
            data: null,
            error: {
              status: res.status,
              message: json?.error ?? `The server answered ${res.status}.`,
            },
          });
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoaded({
          key,
          data: null,
          error: { status: 0, message: "Couldn’t reach the server. Is `npm run dev` still running?" },
        });
      });

    return () => controller.abort();
  }, [url, key]);

  const current = loaded && loaded.key === key ? loaded : null;
  const retry = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: url !== null && current === null,
    retry,
  };
}
