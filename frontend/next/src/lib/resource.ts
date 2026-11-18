import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

// A small cached-fetch layer: one request per key at a time, results shared by every component that asks,
// cancellation when nobody is listening any more, and an explicit retry. Enough for read-only content;
// if the app grows mutations, swap this for a library without changing the call sites (useResource).

export type ResourceState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

interface Entry<T> {
  state: ResourceState<T>;
  listeners: Set<() => void>;
  controller: AbortController | null;
}

const cache = new Map<string, Entry<unknown>>();

function entry<T>(key: string): Entry<T> {
  let e = cache.get(key) as Entry<T> | undefined;
  if (!e) {
    e = { state: { status: "loading" }, listeners: new Set(), controller: null };
    cache.set(key, e as Entry<unknown>);
  }
  return e;
}

function set<T>(key: string, state: ResourceState<T>): void {
  const e = entry<T>(key);
  e.state = state;
  e.listeners.forEach((l) => l());
}

export function load<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>, force = false): void {
  const e = entry<T>(key);
  if (!force && (e.controller || e.state.status === "success")) return;
  e.controller?.abort();
  const controller = new AbortController();
  e.controller = controller;
  set<T>(key, { status: "loading" });
  fetcher(controller.signal).then(
    (data) => {
      if (e.controller !== controller) return;
      e.controller = null;
      set<T>(key, { status: "success", data });
    },
    (error: unknown) => {
      if (e.controller !== controller || controller.signal.aborted) return;
      e.controller = null;
      set<T>(key, { status: "error", error: error instanceof Error ? error : new Error(String(error)) });
    },
  );
}

/** For tests: forget everything. */
export function resetResources(): void {
  cache.forEach((e) => e.controller?.abort());
  cache.clear();
}

export function useResource<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>): ResourceState<T> & { retry: () => void } {
  const subscribe = useCallback(
    (cb: () => void) => {
      const e = entry<T>(key);
      e.listeners.add(cb);
      return () => {
        e.listeners.delete(cb);
        // nobody left waiting for an unfinished request: cancel it so it can start fresh next time
        if (e.listeners.size === 0 && e.controller) {
          e.controller.abort();
          e.controller = null;
          e.state = { status: "loading" };
        }
      };
    },
    [key],
  );
  const state = useSyncExternalStore(subscribe, () => entry<T>(key).state);
  useEffect(() => load(key, fetcher), [key, fetcher]);
  const retry = useCallback(() => load(key, fetcher, true), [key, fetcher]);
  return useMemo(() => ({ ...state, retry }), [state, retry]);
}
