import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { imageSet, image } from "@/lib/db/app-schema";
import { ImageSetDetail } from "./image-set-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const [session, { setId }] = await Promise.all([requireSession(), params]);

  const [set] = await db
    .select()
    .from(imageSet)
    .where(and(eq(imageSet.id, setId), eq(imageSet.userId, session.user.id)));

  if (!set) notFound();

  const images = await db
    .select()
    .from(image)
    .where(eq(image.imageSetId, setId))
    .orderBy(image.createdAt);

  return (
    <ImageSetDetail
      set={{ id: set.id, name: set.name }}
      images={images.map((img) => ({
        id: img.id,
        url: img.url,
        name: img.name,
      }))}
    />
  );
}
