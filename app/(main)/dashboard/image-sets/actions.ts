"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db, withUserLock } from "@/lib/db";
import { image, imageSet, puzzle, site } from "@/lib/db/app-schema";
import {
  cleanupR2Keys,
  deleteFromR2,
  processImage,
  r2KeyFromUrl,
  uploadBufferToR2,
} from "@/lib/r2";
import {
  checkQuota,
  getUserStorageUsage,
  QuotaExceededError,
  STORAGE_QUOTA_BYTES,
} from "@/lib/storage-quota";
import { galleryItemHashRefs } from "@/lib/storage-refcount";
import type { ActionState } from "@/lib/types";

export type { ActionState } from "@/lib/types";

export interface ReferencingPuzzle {
  puzzleId: string;
  puzzlePrompt: string;
  siteId: string;
  siteName: string;
}

async function requireOwnedSet(setId: string, userId: string) {
  const [set] = await db
    .select({ id: imageSet.id })
    .from(imageSet)
    .where(and(eq(imageSet.id, setId), eq(imageSet.userId, userId)));
  return set ?? null;
}

const createSetSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export async function createImageSet(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = createSetSchema.safeParse({
    name: formData.get("resource-name"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const [created] = await db
    .insert(imageSet)
    .values({
      userId: session.user.id,
      name: parsed.data.name,
    })
    .returning({ id: imageSet.id });

  return { success: true, values: { id: created.id } };
}

const updateSetSchema = z.object({
  setId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export async function updateImageSetName(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = updateSetSchema.safeParse({
    setId: formData.get("setId"),
    name: formData.get("resource-name"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const result = await db
    .update(imageSet)
    .set({ name: parsed.data.name })
    .where(
      and(
        eq(imageSet.id, parsed.data.setId),
        eq(imageSet.userId, session.user.id),
      ),
    )
    .returning();

  if (result.length === 0) {
    return { errors: { setId: ["Image set not found"] } };
  }

  revalidatePath(`/dashboard/image-sets/${parsed.data.setId}`);
  return { success: true, message: "Name updated" };
}

export async function uploadImages(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const setId = formData.get("setId") as string;

  if (!setId) return { errors: { setId: ["Missing set ID"] } };

  const set = await requireOwnedSet(setId, session.user.id);
  if (!set) return { errors: { setId: ["Image set not found"] } };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_FILES = 50;

  const files = formData.getAll("files") as File[];
  if (files.length === 0) {
    return { errors: { files: ["No files selected"] } };
  }

  if (files.length > MAX_FILES) {
    return { errors: { files: [`Maximum ${MAX_FILES} files at a time`] } };
  }

  const validFiles: File[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      skipped.push(`${file.name} (not an image)`);
    } else if (file.size > MAX_FILE_SIZE) {
      skipped.push(`${file.name} (exceeds 5MB)`);
    } else {
      validFiles.push(file);
    }
  }

  const processResults = await Promise.allSettled(
    validFiles.map(async (file) => {
      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const result = await processImage(rawBuffer);
      return { file, ...result };
    }),
  );

  const processed: { file: File; buffer: Buffer; contentHash: string }[] = [];
  for (let i = 0; i < processResults.length; i++) {
    const r = processResults[i];
    if (r.status === "fulfilled") {
      processed.push(r.value);
    } else {
      skipped.push(`${validFiles[i].name} (invalid image)`);
    }
  }

  // deduplicate: check which content hashes already exist in this image set
  const hashes = processed.map((p) => p.contentHash);
  const existingInSet =
    hashes.length > 0
      ? new Set(
          (
            await db
              .select({ contentHash: image.contentHash })
              .from(image)
              .where(
                and(
                  eq(image.imageSetId, setId),
                  inArray(image.contentHash, hashes),
                ),
              )
          ).map((r) => r.contentHash),
        )
      : new Set<string>();

  // check for cross-set dedup (same hash in another set = reuse R2 URL)
  const newHashes = hashes.filter((h) => !existingInSet.has(h));
  const crossSetRows =
    newHashes.length > 0
      ? await db
          .select({ contentHash: image.contentHash, url: image.url })
          .from(image)
          .where(inArray(image.contentHash, newHashes))
      : [];
  const crossSetMap = new Map(crossSetRows.map((e) => [e.contentHash, e.url]));

  const newProcessed = processed.filter(
    (p) => !existingInSet.has(p.contentHash),
  );
  const dupeCount = processed.length - newProcessed.length;

  if (dupeCount > 0) {
    skipped.push(
      `${dupeCount} duplicate${dupeCount === 1 ? "" : "s"} already in set`,
    );
  }

  const newlyUploadedKeys: string[] = [];
  let uploadedCount: number;
  try {
    uploadedCount = await withUserLock(session.user.id, async (tx) => {
      const usage = await getUserStorageUsage(session.user.id, tx);
      let provisionalBytes = usage.totalBytes;
      const accepted: typeof newProcessed = [];
      let quotaSkipped = 0;
      for (const item of newProcessed) {
        const next = provisionalBytes + item.buffer.length;
        if (next > STORAGE_QUOTA_BYTES) {
          quotaSkipped++;
          continue;
        }
        provisionalBytes = next;
        accepted.push(item);
      }
      if (quotaSkipped > 0) {
        skipped.push(`${quotaSkipped} over storage quota`);
      }

      const sizeByHash = new Map(
        accepted.map((p) => [p.contentHash, p.buffer.length]),
      );

      const results = await Promise.allSettled(
        accepted.map(async ({ file, buffer, contentHash }) => {
          const existingUrl = crossSetMap.get(contentHash);
          if (existingUrl) {
            return { url: existingUrl, name: file.name, contentHash };
          }
          const { key, url } = await uploadBufferToR2(buffer);
          newlyUploadedKeys.push(key);
          return { url, name: file.name, contentHash };
        }),
      );

      const uploaded = results
        .filter(
          (
            r,
          ): r is PromiseFulfilledResult<{
            url: string;
            name: string;
            contentHash: string;
          }> => r.status === "fulfilled",
        )
        .map((r) => r.value);

      if (uploaded.length > 0) {
        await tx.insert(image).values(
          uploaded.map((u) => ({
            imageSetId: setId,
            url: u.url,
            name: u.name,
            contentHash: u.contentHash,
            sizeBytes: sizeByHash.get(u.contentHash) ?? 0,
          })),
        );
      }

      return uploaded.length;
    });
  } catch (err) {
    await cleanupR2Keys(newlyUploadedKeys);
    throw err;
  }

  revalidatePath(`/dashboard/image-sets/${setId}`);

  let message = `${uploadedCount} image${uploadedCount === 1 ? "" : "s"} uploaded`;
  if (skipped.length > 0) {
    message += `. Skipped: ${skipped.join(", ")}`;
  }

  return { success: true, message };
}

export type UploadSingleResult =
  | { status: "ok"; name: string }
  | { status: "duplicate"; name: string }
  | { status: "quota"; name: string }
  | { status: "error"; name: string; error: string };

export async function uploadSingleImage(
  setId: string,
  file: File,
): Promise<UploadSingleResult> {
  const session = await requireSession();
  const name = file.name;

  const set = await requireOwnedSet(setId, session.user.id);
  if (!set) return { status: "error", name, error: "Image set not found" };

  let buffer: Buffer;
  let contentHash: string;
  try {
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const result = await processImage(rawBuffer);
    buffer = result.buffer;
    contentHash = result.contentHash;
  } catch {
    return { status: "error", name, error: "Invalid image" };
  }

  // Check duplicate in this set (no quota impact — safe outside the lock)
  const [existing] = await db
    .select({ id: image.id })
    .from(image)
    .where(and(eq(image.imageSetId, setId), eq(image.contentHash, contentHash)))
    .limit(1);

  if (existing) {
    return { status: "duplicate", name };
  }

  let uploadedKey: string | null = null;
  try {
    await withUserLock(session.user.id, async (tx) => {
      const usage = await getUserStorageUsage(session.user.id, tx);
      const quotaErr = checkQuota(usage, buffer.length);
      if (quotaErr) throw new QuotaExceededError(quotaErr);

      const [crossSet] = await tx
        .select({ url: image.url })
        .from(image)
        .where(eq(image.contentHash, contentHash))
        .limit(1);

      let url: string;
      if (crossSet) {
        url = crossSet.url;
      } else {
        const uploaded = await uploadBufferToR2(buffer);
        url = uploaded.url;
        uploadedKey = uploaded.key;
      }

      await tx.insert(image).values({
        imageSetId: setId,
        url,
        name,
        contentHash,
        sizeBytes: buffer.length,
      });
    });
  } catch (err) {
    await cleanupR2Keys([uploadedKey]);
    if (err instanceof QuotaExceededError) return { status: "quota", name };
    throw err;
  }

  revalidatePath(`/dashboard/image-sets/${setId}`);
  return { status: "ok", name };
}

export async function deleteImage(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const imageId = formData.get("imageId") as string;
  const setId = formData.get("setId") as string;

  if (!imageId || !setId) {
    return { errors: { imageId: ["Missing image ID"] } };
  }

  const set = await requireOwnedSet(setId, session.user.id);
  if (!set) return { errors: { setId: ["Image set not found"] } };

  // can't delete images that the user's own puzzles depend on
  const [ref] = await db
    .select({ id: puzzle.id })
    .from(puzzle)
    .innerJoin(
      site,
      and(eq(site.id, puzzle.siteId), eq(site.userId, session.user.id)),
    )
    .where(
      sql`${puzzle.correctImageIds}::jsonb @> ${JSON.stringify([imageId])}::jsonb
        OR (${puzzle.incorrectImageIds} IS NOT NULL AND ${puzzle.incorrectImageIds}::jsonb @> ${JSON.stringify([imageId])}::jsonb)`,
    )
    .limit(1);

  if (ref) {
    return {
      errors: {
        imageId: [
          "This image is used by a puzzle. Remove it from the puzzle first.",
        ],
      },
    };
  }

  // Lock same-user writes so the refcount read-after-delete is atomic
  // wrt concurrent publishes/uploads that might add a reference to the
  // same contentHash (image row or gallery_item.images[]).
  const result = await withUserLock(session.user.id, async (tx) => {
    const [img] = await tx
      .select({ id: image.id, url: image.url, contentHash: image.contentHash })
      .from(image)
      .where(and(eq(image.id, imageId), eq(image.imageSetId, setId)));
    if (!img) return null;

    await tx.delete(image).where(eq(image.id, imageId));

    if (!img.contentHash) return { url: img.url, purge: true };

    const [imgRef] = await tx
      .select({ id: image.id })
      .from(image)
      .where(eq(image.contentHash, img.contentHash))
      .limit(1);
    if (imgRef) return { url: img.url, purge: false };

    const galleryRefs = await galleryItemHashRefs(tx, [img.contentHash]);
    return { url: img.url, purge: !galleryRefs.has(img.contentHash) };
  });

  if (!result) return { errors: { imageId: ["Image not found"] } };

  // R2 delete runs after lock release — by this point the refcount was
  // accurate, and no new reference can land on the same URL (fresh
  // uploads get a new nanoid key even for a matching hash).
  if (result.purge) {
    try {
      await deleteFromR2(r2KeyFromUrl(result.url));
    } catch (err) {
      console.warn(`R2 cleanup failed for image ${imageId}:`, err);
    }
  }

  revalidatePath(`/dashboard/image-sets/${setId}`);
  return { success: true, message: "Image deleted" };
}

export type DeleteImageSetResult =
  | (NonNullable<ActionState> & { referencingPuzzles?: ReferencingPuzzle[] })
  | null;

export async function deleteImageSet(
  prevState: DeleteImageSetResult,
  formData: FormData,
): Promise<DeleteImageSetResult> {
  const session = await requireSession();
  const setId = formData.get("setId") as string;

  if (!setId) return { errors: { setId: ["Missing set ID"] } };

  const set = await requireOwnedSet(setId, session.user.id);
  if (!set) return { errors: { setId: ["Image set not found"] } };

  const referencingPuzzles = await db
    .select({
      puzzleId: puzzle.id,
      puzzlePrompt: puzzle.prompt,
      siteId: site.id,
      siteName: site.name,
    })
    .from(puzzle)
    .innerJoin(
      site,
      and(eq(site.id, puzzle.siteId), eq(site.userId, session.user.id)),
    )
    .where(eq(puzzle.imageSetId, setId));

  if (referencingPuzzles.length > 0) {
    return {
      errors: {
        setId: [
          "This image set is used by one or more puzzles. Remove those puzzles first.",
        ],
      },
      referencingPuzzles,
    };
  }

  // All DB work inside the lock: read current image rows, cascade-delete
  // via imageSet removal, then refcount across `image.contentHash` and
  // `gallery_item.images[]`. Reading `imgs` outside the lock would miss
  // rows added by a concurrent same-user upload that the cascade then
  // silently deletes, orphaning their R2 keys.
  const { imgs, imageRefs, galleryRefs } = await withUserLock(
    session.user.id,
    async (tx) => {
      const imgs = await tx
        .select({ url: image.url, contentHash: image.contentHash })
        .from(image)
        .where(eq(image.imageSetId, setId));

      await tx.delete(imageSet).where(eq(imageSet.id, setId));

      const hashesToCheck = imgs
        .map((i) => i.contentHash)
        .filter((h): h is string => h !== null);

      const imageRefs =
        hashesToCheck.length > 0
          ? new Set(
              (
                await tx
                  .select({ contentHash: image.contentHash })
                  .from(image)
                  .where(inArray(image.contentHash, hashesToCheck))
              )
                .map((r) => r.contentHash)
                .filter((h): h is string => !!h),
            )
          : new Set<string>();
      const galleryRefs = await galleryItemHashRefs(tx, hashesToCheck);

      return { imgs, imageRefs, galleryRefs };
    },
  );

  // Null-hash rows pre-date dedup and can't have other references, so
  // always delete their R2 object. Hashed rows survive if either the
  // image table or a gallery_item still points at the same content.
  const toDelete = imgs.filter(
    (img) =>
      img.contentHash === null ||
      (!imageRefs.has(img.contentHash) && !galleryRefs.has(img.contentHash)),
  );

  const results = await Promise.allSettled(
    toDelete.map((img) => deleteFromR2(r2KeyFromUrl(img.url))),
  );
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      console.warn(
        `R2 cleanup failed for image set ${setId} key ${toDelete[i].url}:`,
        (results[i] as PromiseRejectedResult).reason,
      );
    }
  }

  redirect("/dashboard/image-sets");
}
