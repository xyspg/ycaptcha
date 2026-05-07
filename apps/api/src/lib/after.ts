/**
 * Fire-and-forget helper for analytics writes after the HTTP response is sent.
 * Replaces Next.js `after()` — Bun/Node keep the event loop alive while the
 * server is running, so we can simply not await the promise.
 */
export function after(fn: () => Promise<unknown>): void {
  fn().catch((err) => {
    console.error("[after] background task failed:", err);
  });
}
