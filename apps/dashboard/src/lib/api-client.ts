import type { ApiApp } from "@ycaptcha/shared";
import { hc } from "hono/client";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const api = hc<ApiApp>(baseUrl, {
  init: { credentials: "include" },
});

/**
 * Throw the response body as an error if the request failed.
 * Useful inside TanStack Query's queryFn / mutationFn:
 *   queryFn: () => unwrap(api.api.sites.$get())
 */
export async function unwrap<T>(promise: Promise<Response>): Promise<T> {
  const res = await promise;
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = { error: res.statusText };
    }
    throw Object.assign(new Error("Request failed"), {
      status: res.status,
      body,
    });
  }
  return res.json() as Promise<T>;
}
