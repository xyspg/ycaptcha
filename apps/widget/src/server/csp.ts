import { eq } from "drizzle-orm";
import { db, site } from "./db";
import { env } from "./env";

const cache = new Map<string, { value: string; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 5000;

const LOCALHOST = "http://localhost:* http://127.0.0.1:*";

export async function getFrameAncestors(siteKey: string): Promise<string> {
  const now = Date.now();
  const cached = cache.get(siteKey);
  if (cached && cached.expires > now) return cached.value;

  let frameAncestors = "'self'";
  let resolved = false;
  try {
    const [row] = await db
      .select({ domain: site.domain })
      .from(site)
      .where(eq(site.siteKey, siteKey));
    if (row) {
      resolved = true;
      if (row.domain) {
        const isDev = env.NODE_ENV !== "production";
        if (row.domain === "localhost") {
          frameAncestors = `'self' ${LOCALHOST}`;
        } else {
          frameAncestors = `'self' https://*.${row.domain} https://${row.domain}${
            isDev ? ` ${LOCALHOST}` : ""
          }`;
        }
      }
    }
  } catch (e) {
    console.error("[csp] domain lookup failed:", e);
  }

  // Only cache resolved (row-exists) lookups: never pin the 'self' fallback
  // from an unknown siteKey or a transient DB error, and bound the map so a
  // flood of random siteKeys cannot exhaust memory.
  if (resolved) {
    if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
    cache.set(siteKey, { value: frameAncestors, expires: now + CACHE_TTL_MS });
  }
  return frameAncestors;
}
