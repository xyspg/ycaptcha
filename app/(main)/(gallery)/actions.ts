"use server";

import { createHash } from "node:crypto";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db, withUserLock } from "@/lib/db";
import { galleryItem, image, imageSet } from "@/lib/db/app-schema";
import { cleanupR2Keys, r2KeyFromUrl } from "@/lib/r2";
import {
  getUserStorageUsage,
  QuotaExceededError,
  STORAGE_QUOTA_BYTES,
} from "@/lib/storage-quota";
import { galleryItemHashRefs } from "@/lib/storage-refcount";
import type { ActionState } from "@/lib/types";

export type { ActionState } from "@/lib/types";

const MAX_ITEMS_PER_USER = 10;
const MAX_IMAGES_PER_ITEM = 60;
const MIN_IMAGES_PER_ITEM = 9;

function computeSetHash(contentHashes: string[]): string {
  return createHash("sha256")
    .update([...contentHashes].sort().join(""))
    .digest("hex");
}

const publishSchema = z.object({
  imageSetId: z.string().min(1),
  title: z.string().trim().min(1, "Title is required").max(80),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .transform((v) => (v.length > 0 ? v : null)),
  anonymous: z.boolean().optional().default(false),
  termsAccepted: z.literal("on", {
    message: "Please accept terms and conditions.",
  }),
});

export async function publishGalleryItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = publishSchema.safeParse({
    imageSetId: formData.get("imageSetId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    anonymous: formData.get("anonymous") === "on",
    termsAccepted: formData.get("termsAccepted"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;

  const set = await db.query.imageSet.findFirst({
    where: (is, { and: a, eq: e }) =>
      a(e(is.id, data.imageSetId), e(is.userId, session.user.id)),
    with: {
      images: {
        columns: {
          id: true,
          url: true,
          name: true,
          contentHash: true,
          sizeBytes: true,
        },
      },
    },
  });

  if (!set) {
    return { errors: { _: ["Image set not found."] } };
  }
  if (set.images.length < MIN_IMAGES_PER_ITEM) {
    return {
      errors: {
        _: [`Needs at least ${MIN_IMAGES_PER_ITEM} images (3×3 grid minimum).`],
      },
    };
  }
  if (set.images.length > MAX_IMAGES_PER_ITEM) {
    return {
      errors: {
        _: [
          `Gallery items are capped at ${MAX_IMAGES_PER_ITEM} images. Trim the set first.`,
        ],
      },
    };
  }

  const [countRow] = await db
    .select({ n: count() })
    .from(galleryItem)
    .where(eq(galleryItem.authorId, session.user.id));
  if ((countRow?.n ?? 0) >= MAX_ITEMS_PER_USER) {
    return {
      errors: {
        _: [
          `You've reached the limit of ${MAX_ITEMS_PER_USER} gallery items. Remove one from /gallery/mine first.`,
        ],
      },
    };
  }

  if (set.images.some((img) => !img.contentHash)) {
    return {
      errors: {
        _: [
          "Some images are missing a content hash. Re-upload them from the image set page.",
        ],
      },
    };
  }

  const imagesHash = computeSetHash(
    set.images.map((img) => img.contentHash as string),
  );
  const [existing] = await db
    .select({ slug: galleryItem.slug })
    .from(galleryItem)
    .where(eq(galleryItem.imagesHash, imagesHash))
    .limit(1);
  if (existing) {
    return {
      errors: {
        _: [
          "This exact image set is already in the gallery. Fork or remix it instead of re-publishing.",
        ],
      },
    };
  }

  // Snapshot the source URLs directly — no R2 copy. Deletion paths use a
  // refcount (image.contentHash + gallery_item.images[]) so these R2
  // objects survive as long as any row still points to them.
  const snapshotImages = set.images.map((img) => ({
    url: img.url,
    name: img.name,
    contentHash: img.contentHash as string,
    sizeBytes: img.sizeBytes,
  }));

  // Serialize against same-user delete paths so their refcount reads see
  // this new gallery_item row before deciding what R2 keys to purge.
  const inserted = await withUserLock(session.user.id, async (tx) => {
    const [row] = await tx
      .insert(galleryItem)
      .values({
        authorId: session.user.id,
        authorDisplayName: session.user.name || "anonymous",
        anonymous: data.anonymous,
        title: data.title,
        description: data.description,
        images: snapshotImages,
        imagesHash,
        status: "published",
      })
      .returning({ slug: galleryItem.slug });
    return row;
  });

  revalidatePath("/gallery");
  revalidatePath("/gallery/mine");
  redirect(`/gallery/${inserted.slug}`);
}

const deleteSchema = z.object({
  slug: z.string().min(1),
});

export async function deleteGalleryItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = deleteSchema.safeParse({ slug: formData.get("slug") });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const [item] = await db
    .select({ id: galleryItem.id, images: galleryItem.images })
    .from(galleryItem)
    .where(
      and(
        eq(galleryItem.slug, parsed.data.slug),
        eq(galleryItem.authorId, session.user.id),
      ),
    )
    .limit(1);

  if (!item) {
    return { errors: { _: ["Gallery item not found."] } };
  }

  const hashes = item.images
    .map((img) => img.contentHash)
    .filter((h): h is string => !!h);

  const { imageRefs, galleryRefs } = await withUserLock(
    session.user.id,
    async (tx) => {
      await tx.delete(galleryItem).where(eq(galleryItem.id, item.id));

      const imageRefs =
        hashes.length > 0
          ? new Set(
              (
                await tx
                  .select({ contentHash: image.contentHash })
                  .from(image)
                  .where(inArray(image.contentHash, hashes))
              )
                .map((r) => r.contentHash)
                .filter((h): h is string => !!h),
            )
          : new Set<string>();
      const galleryRefs = await galleryItemHashRefs(tx, hashes);
      return { imageRefs, galleryRefs };
    },
  );

  const toDelete = item.images
    .filter(
      (img) =>
        !imageRefs.has(img.contentHash) && !galleryRefs.has(img.contentHash),
    )
    .map((img) => r2KeyFromUrl(img.url));

  await cleanupR2Keys(toDelete);

  revalidatePath("/gallery");
  revalidatePath("/gallery/mine");
  revalidatePath(`/gallery/${parsed.data.slug}`);
  return { success: true };
}

const forkSchema = z.object({
  slug: z.string().min(1),
});

export async function forkGalleryItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = forkSchema.safeParse({ slug: formData.get("slug") });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const [item] = await db
    .select({
      id: galleryItem.id,
      title: galleryItem.title,
      images: galleryItem.images,
      imagesHash: galleryItem.imagesHash,
    })
    .from(galleryItem)
    .where(
      and(
        eq(galleryItem.slug, parsed.data.slug),
        eq(galleryItem.status, "published"),
      ),
    );

  if (!item) {
    return { errors: { _: ["Gallery item not found or unpublished."] } };
  }

  // Refuse if the user already has an image set with the same content — any of
  // their own sets whose contentHash multiset equals the gallery item's.
  const galleryHashes = item.images.map((img) => img.contentHash);
  const userRows = await db
    .select({ imageSetId: image.imageSetId, contentHash: image.contentHash })
    .from(image)
    .innerJoin(imageSet, eq(image.imageSetId, imageSet.id))
    .where(eq(imageSet.userId, session.user.id));
  const bySet = new Map<string, string[]>();
  for (const r of userRows) {
    if (!r.contentHash) continue;
    const arr = bySet.get(r.imageSetId) ?? [];
    arr.push(r.contentHash);
    bySet.set(r.imageSetId, arr);
  }
  for (const hashes of bySet.values()) {
    if (hashes.length !== galleryHashes.length) continue;
    if (computeSetHash(hashes) === item.imagesHash) {
      return {
        errors: {
          _: ["You already have this image set in your library."],
        },
      };
    }
  }

  // Fork is a pure DB op — the forker's image rows reference the gallery's
  // existing R2 URLs. Deletion refcount (image.contentHash +
  // gallery_item.images[]) preserves those objects as long as any row
  // points to them.
  const forkBytes = item.images.reduce((n, img) => n + img.sizeBytes, 0);

  let newSetId: string;
  try {
    newSetId = await withUserLock(session.user.id, async (tx) => {
      const usage = await getUserStorageUsage(session.user.id, tx);
      if (usage.totalBytes + forkBytes > STORAGE_QUOTA_BYTES) {
        throw new QuotaExceededError(
          "Forking this set would exceed your storage quota. Remove some images first.",
        );
      }

      const [newSet] = await tx
        .insert(imageSet)
        .values({
          userId: session.user.id,
          name: `${item.title} (forked)`,
        })
        .returning({ id: imageSet.id });

      await Promise.all([
        tx.insert(image).values(
          item.images.map((img) => ({
            imageSetId: newSet.id,
            url: img.url,
            name: img.name,
            contentHash: img.contentHash,
            sizeBytes: img.sizeBytes,
          })),
        ),
        tx
          .update(galleryItem)
          .set({ downloadCount: sql`${galleryItem.downloadCount} + 1` })
          .where(eq(galleryItem.id, item.id)),
      ]);

      return newSet.id;
    });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return { errors: { _: [err.message] } };
    }
    throw err;
  }

  revalidatePath("/dashboard/image-sets");
  redirect(`/dashboard/image-sets/${newSetId}`);
}
