import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { env } from "@/lib/env";
import * as appSchema from "./app-schema";
import * as schema from "./schema";

export const db = drizzle(env.DATABASE_URL, {
  schema: { ...schema, ...appSchema },
});

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Run `fn` inside a Postgres transaction holding a per-user advisory lock.
 * Any concurrent call with the same `userId` blocks until this transaction
 * commits or rolls back — serializes quota read-then-write sections.
 */
export async function withUserLock<T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);
    return fn(tx);
  });
}
