import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SiteAnalyticsSection } from "@/components/site-analytics-section";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { puzzle, site } from "@/lib/db/app-schema";
import { SiteDetail } from "./site-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([requireSession(), params]);

  const [[siteData], puzzles] = await Promise.all([
    db
      .select()
      .from(site)
      .where(and(eq(site.id, id), eq(site.userId, session.user.id))),
    db.select().from(puzzle).where(eq(puzzle.siteId, id)),
  ]);

  if (!siteData) notFound();

  return (
    <SiteDetail
      site={siteData}
      puzzles={puzzles}
      analyticsSlot={
        <SiteAnalyticsSection siteId={siteData.id} userId={session.user.id} />
      }
    />
  );
}
