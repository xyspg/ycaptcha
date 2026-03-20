import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { site, imageSet, image } from "@/lib/db/app-schema";
import { CreatePuzzleForm } from "./create-puzzle-form";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([requireSession(), params]);

  // Verify site belongs to user
  const [siteData] = await db
    .select({ id: site.id, name: site.name })
    .from(site)
    .where(and(eq(site.id, id), eq(site.userId, session.user.id)));

  if (!siteData) notFound();

  // Fetch all image sets with their images for this user
  const imageSets = await db.query.imageSet.findMany({
    where: (is, { eq: e }) => e(is.userId, session.user.id),
    with: { images: true },
    orderBy: (is, { desc }) => desc(is.createdAt),
  });

  return (
    <CreatePuzzleForm
      siteId={siteData.id}
      siteName={siteData.name}
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
