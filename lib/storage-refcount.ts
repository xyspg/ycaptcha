import { sql } from "drizzle-orm";
import type { db, Tx } from "@/lib/db";

type QueryClient = typeof db | Tx;

/**
 * Returns the subset of `hashes` that are still referenced by any
 * `gallery_item.images[]` entry (any status). Deletion paths call this
 * plus the `image.content_hash` refcount to decide whether the R2
 * object for a given hash is safe to delete.
 *
 * No GIN index: we full-scan gallery_item. Fine at current scale (<=10
 * items per user, jsonb arrays capped at 60). Revisit if the gallery
 * grows by 100x.
 */
export async function galleryItemHashRefs(
  client: QueryClient,
  hashes: string[],
): Promise<Set<string>> {
  if (hashes.length === 0) return new Set();

  // `e->>'contentHash' IN (${hashes})` — drizzle's sql tag spreads an array
  // into comma-separated placeholders, which is what `IN (…)` wants. `= ANY`
  // would need a single Postgres array param; the spread form doesn't bind
  // correctly through neon-serverless.
  const result = await client.execute<{ hash: string | null }>(sql`
    SELECT DISTINCT e->>'contentHash' AS hash
    FROM gallery_item gi, jsonb_array_elements(gi.images) e
    WHERE e->>'contentHash' IN (${sql.join(
      hashes.map((h) => sql`${h}`),
      sql`, `,
    )})
  `);

  const rows =
    (result as unknown as { rows: { hash: string | null }[] }).rows ?? [];
  const out = new Set<string>();
  for (const r of rows) {
    if (r.hash) out.add(r.hash);
  }
  return out;
}
