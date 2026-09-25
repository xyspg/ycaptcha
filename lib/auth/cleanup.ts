import * as Sentry from "@sentry/nextjs";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  audio,
  galleryItem,
  image,
  imageSet,
  puzzle,
  site,
} from "@/lib/db/app-schema";
import { revalidateGalleryBrowse } from "@/lib/gallery-revalidate";
import { deleteFromR2, r2KeyFromUrl } from "@/lib/r2";
import { galleryItemHashRefs } from "@/lib/storage-refcount";

/**
 * Delete all of a user's app-level data and the R2 objects that were
 * referenced only by them. Called from `betterAuth.user.deleteUser.beforeDelete`
 * and directly from integration tests.
 *
 * Refcount rules:
 *  - An R2 `images/*` object survives if ANY other user's `image` row
 *    shares the same contentHash.
 *  - An R2 `images/*` object also survives if ANY remaining `gallery_item`
 *    snapshot (from another user, since we've already deleted this user's
 *    gallery items) references the same contentHash in its `images[]`.
 *
 * Audio objects have no cross-user dedup yet, so they're deleted
 * unconditionally.
 */
export async function cleanupUserOnDelete(userId: string): Promise<void> {
  await db
    .delete(puzzle)
    .where(
      inArray(
        puzzle.siteId,
        db.select({ id: site.id }).from(site).where(eq(site.userId, userId)),
      ),
    );

  const [imageRows, audioRows, galleryRows] = await Promise.all([
    db
      .select({ url: image.url, contentHash: image.contentHash })
      .from(image)
      .innerJoin(imageSet, eq(imageSet.id, image.imageSetId))
      .where(eq(imageSet.userId, userId)),
    db.select({ url: audio.url }).from(audio).where(eq(audio.userId, userId)),
    db
      .select({ images: galleryItem.images })
      .from(galleryItem)
      .where(eq(galleryItem.authorId, userId)),
  ]);

  await db.delete(galleryItem).where(eq(galleryItem.authorId, userId));
  // the static browse page would otherwise list them (with deleted images)
  // until its hourly refresh
  if (galleryRows.length > 0) revalidateGalleryBrowse();

  const imageHashes = imageRows
    .map((r) => r.contentHash)
    .filter((h): h is string => h !== null);
  const galleryHashes = galleryRows
    .flatMap((r) => r.images.map((img) => img.contentHash))
    .filter((h): h is string => !!h);
  const allHashes = [...new Set([...imageHashes, ...galleryHashes])];

  const [otherUserImageRefs, otherUserGalleryRefs] = await Promise.all([
    allHashes.length > 0
      ? db
          .select({ contentHash: image.contentHash })
          .from(image)
          .innerJoin(imageSet, eq(imageSet.id, image.imageSetId))
          .where(
            and(
              inArray(image.contentHash, allHashes),
              ne(imageSet.userId, userId),
            ),
          )
      : Promise.resolve([] as { contentHash: string | null }[]),
    galleryItemHashRefs(db, allHashes),
  ]);
  const stillReferenced = new Set<string>();
  for (const r of otherUserImageRefs) {
    if (r.contentHash) stillReferenced.add(r.contentHash);
  }
  for (const h of otherUserGalleryRefs) stillReferenced.add(h);

  const keys = [
    ...new Set(
      [
        ...imageRows
          .filter(
            (r) =>
              r.contentHash === null || !stillReferenced.has(r.contentHash),
          )
          .map((r) => r.url),
        ...audioRows.map((r) => r.url),
        ...galleryRows
          .flatMap((r) => r.images)
          .filter((img) => !stillReferenced.has(img.contentHash))
          .map((img) => img.url),
      ].map(r2KeyFromUrl),
    ),
  ];

  const results = await Promise.allSettled(keys.map(deleteFromR2));
  const failedKeys = keys.filter((_, i) => results[i].status === "rejected");
  const failedReasons = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason?.message);

  if (failedKeys.length > 0) {
    Sentry.captureMessage("R2 cleanup failed in account deletion", {
      level: "error",
      extra: {
        userId,
        failedCount: failedKeys.length,
        totalCount: results.length,
        failedKeys,
        failedReasons,
      },
    });
  }
}
