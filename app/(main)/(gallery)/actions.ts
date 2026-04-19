"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { galleryItem, image, imageSet } from "@/lib/db/app-schema";
import { copyObjectInR2, deleteFromR2, r2KeyFromUrl } from "@/lib/r2";
import type { ActionState } from "@/lib/types";

export type { ActionState } from "@/lib/types";

const MAX_ITEMS_PER_USER = 10;
const MAX_IMAGES_PER_ITEM = 60;
const MIN_IMAGES_PER_ITEM = 9;

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
        columns: { id: true, url: true, name: true, contentHash: true },
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

  const itemId = nanoid();
  const copiedImages = await Promise.all(
    set.images.map(async (img) => {
      const contentHash = img.contentHash as string;
      const copied = await copyObjectInR2(
        r2KeyFromUrl(img.url),
        `gallery/${itemId}/${contentHash}.webp`,
      );
      return { url: copied.url, name: img.name, contentHash };
    }),
  );

  const [inserted] = await db
    .insert(galleryItem)
    .values({
      id: itemId,
      authorId: session.user.id,
      authorDisplayName: session.user.name || "anonymous",
      anonymous: data.anonymous,
      title: data.title,
      description: data.description,
      images: copiedImages,
      status: "published",
    })
    .returning({ slug: galleryItem.slug });

  revalidatePath("/gallery");
  revalidatePath("/gallery/mine");
  redirect(`/gallery/${inserted.slug}`);
}

const deleteSchema = z.object({
  slug: z.string().min(1),
});

// DB-first so a failed R2 call leaves orphaned objects instead of a stale row.
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

  await db.delete(galleryItem).where(eq(galleryItem.id, item.id));

  const results = await Promise.allSettled(
    item.images.map((img) => deleteFromR2(r2KeyFromUrl(img.url))),
  );
  for (const r of results) {
    if (r.status === "rejected") {
      console.error(
        "[gallery] R2 cleanup failed for removed item",
        item.id,
        r.reason,
      );
    }
  }

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

  const [newSet] = await db
    .insert(imageSet)
    .values({
      userId: session.user.id,
      name: `${item.title} (forked)`,
    })
    .returning({ id: imageSet.id });

  const copied = await Promise.all(
    item.images.map((img) =>
      copyObjectInR2(r2KeyFromUrl(img.url), `images/${nanoid()}.webp`).then(
        (c) => ({
          imageSetId: newSet.id,
          url: c.url,
          name: img.name,
          contentHash: img.contentHash,
          sizeBytes: 0,
        }),
      ),
    ),
  );

  await Promise.all([
    db.insert(image).values(copied),
    db
      .update(galleryItem)
      .set({ downloadCount: sql`${galleryItem.downloadCount} + 1` })
      .where(eq(galleryItem.id, item.id)),
  ]);

  revalidatePath("/dashboard/image-sets");
  redirect(`/dashboard/image-sets/${newSet.id}`);
}
