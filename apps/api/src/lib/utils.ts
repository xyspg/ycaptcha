/**
 * Read the real client IP from headers set by an upstream proxy.
 *
 * Prefer single-value, proxy-set headers (`cf-connecting-ip`, `x-real-ip`)
 * which carry the originating address regardless of how many hops appear
 * in `x-forwarded-for`. Fall back to the leftmost entry of XFF (the client
 * the first proxy saw); the rightmost entry is the closest proxy and
 * causes shared rate-limit buckets when multiple users sit behind one NAT.
 */
export function getClientIP(request: Request): string {
  const norm = (v: string) => (v === "::1" ? "127.0.0.1" : v);
  const direct =
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim();
  if (direct) return norm(direct);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? norm(ip) : "127.0.0.1";
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}
