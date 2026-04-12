import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { site } from "@/lib/db/app-schema";
import { CreatePuzzleForm } from "./create-puzzle-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string }>;
}) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);

  const sites = await db
    .select({ id: site.id, name: site.name })
    .from(site)
    .where(eq(site.userId, session.user.id));

  const imageSets = await db.query.imageSet.findMany({
    where: (is, { eq: e }) => e(is.userId, session.user.id),
    with: { images: true },
    orderBy: (is, { desc }) => desc(is.createdAt),
  });

  return (
    <CreatePuzzleForm
      sites={sites}
      defaultSiteId={params.siteId}
      imageSets={imageSets.map((is) => ({
        id: is.id,
        name: is.name,
        images: is.images.map((img) => ({
          id: img.id,
          url: img.url,
          name: img.name,
        })),
      }))}
    />
  );
}
