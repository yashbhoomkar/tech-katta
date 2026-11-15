import type { ArticlesResponse, SiteResponse } from "./types";

/** Base URL of the content API. Defaults to production; VITE_API_BASE points a local build elsewhere. */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? "https://tech-api.katta.cc").replace(/\/$/, "");

export class ApiError extends Error {
  override readonly name = "ApiError";
  constructor(
    message: string,
    readonly status: number | null,
    readonly path: string,
  ) {
    super(message);
  }
  /** Network failures and 5xx are worth a "Try again"; a 404 is not. */
  get retryable(): boolean {
    return this.status === null || this.status >= 500;
  }
}

const TIMEOUT_MS = 12_000;

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  // a timeout plus the caller's cancel, without AbortSignal.any (missing before Safari 17.4)
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { signal: controller.signal, headers: { Accept: "application/json" } });
  } catch (err) {
    if (signal?.aborted) throw err; // the caller cancelled: let it see the AbortError
    throw new ApiError(timedOut ? "The server took too long to answer." : "Couldn't reach the server.", null, path);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
  if (!res.ok) throw new ApiError(`The server answered ${res.status}.`, res.status, path);
  return (await res.json()) as T;
}

export const api = {
  site: (signal?: AbortSignal) => getJson<SiteResponse>("/v1/site", signal),
  articles: (signal?: AbortSignal) => getJson<ArticlesResponse>("/v1/articles", signal),
};
