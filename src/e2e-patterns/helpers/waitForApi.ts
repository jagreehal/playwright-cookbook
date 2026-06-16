import type { Page, Response } from '@playwright/test';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface WaitForApiOptions {
  /** Substring matched against the response URL. */
  urlPart: string;
  /** Restrict the match to one HTTP method. */
  method?: HttpMethod;
  /**
   * Only match a successful (2xx/3xx) response. Defaults to true.
   * Set to false to wait for an error response (e.g. a 500 done-signal).
   */
  ok?: boolean;
}

/**
 * Resolves when a matching network response arrives. Use it as a done-signal:
 * start the wait before the action, then await it after.
 *
 * By default it matches only successful responses, so a failing request keeps
 * the wait pending until it times out. Pass `ok: false` to wait for an error.
 */
export function waitForApi(page: Page, opts: WaitForApiOptions): Promise<Response> {
  const { urlPart, method, ok = true } = opts;
  return page.waitForResponse(
    (r) =>
      r.url().includes(urlPart) &&
      (!method || r.request().method() === method) &&
      (!ok || r.ok()),
  );
}

/** Wait for a matching response and parse its JSON body as `T`. */
export async function waitForJson<T>(page: Page, opts: WaitForApiOptions): Promise<T> {
  const response = await waitForApi(page, opts);
  return (await response.json()) as T;
}
