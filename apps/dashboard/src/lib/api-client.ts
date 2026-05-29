import type { ApiApp } from "@ycaptcha/shared";
import { hc, type InferResponseType } from "hono/client";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const api = hc<ApiApp>(baseUrl, {
  init: { credentials: "include" },
});

export type Site = Extract<
  InferResponseType<(typeof api.api.v1.sites)[":id"]["$get"]>,
  { site: unknown }
>["site"];

/**
 * Throw the response body as an error if the request failed.
 * Useful inside TanStack Query's queryFn / mutationFn:
 *   queryFn: () => unwrap(api.api.v1.sites.$get())
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
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : res.statusText || "Request failed";
    throw Object.assign(new Error(message), {
      status: res.status,
      body,
    });
  }
  return res.json() as Promise<T>;
}
