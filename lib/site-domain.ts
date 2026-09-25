import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { site } from "@/lib/db/app-schema";

export async function getSiteDomain(siteKey: string): Promise<string | null> {
  const [row] = await db
    .select({ domain: site.domain })
    .from(site)
    .where(eq(site.siteKey, siteKey));
  return row?.domain ?? null;
}
