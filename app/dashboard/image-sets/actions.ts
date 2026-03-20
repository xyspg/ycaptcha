"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { imageSet, image, puzzle } from "@/lib/db/app-schema";
import { and, eq, sql } from "drizzle-orm";
import { uploadToR2, deleteFromR2, r2KeyFromUrl } from "@/lib/r2";

export type ActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | null;

// --- Create Image Set ---

const createSetSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export async function createImageSet(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = createSetSchema.safeParse({
    name: formData.get("name"),
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

  redirect(`/dashboard/image-sets/${created.id}`);
}

// --- Update Image Set Name ---

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
    name: formData.get("name"),
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

// --- Upload Images ---

export async function uploadImages(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const setId = formData.get("setId") as string;

  if (!setId) return { errors: { setId: ["Missing set ID"] } };

  // Verify ownership
  const [set] = await db
    .select({ id: imageSet.id })
    .from(imageSet)
    .where(and(eq(imageSet.id, setId), eq(imageSet.userId, session.user.id)));

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

  const uploaded: { url: string; name: string }[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      skipped.push(`${file.name} (not an image)`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      skipped.push(`${file.name} (exceeds 5MB)`);
      continue;
    }
    const { url } = await uploadToR2(file);
    uploaded.push({ url, name: file.name });
  }

  if (uploaded.length > 0) {
    await db.insert(image).values(
      uploaded.map((u) => ({
        imageSetId: setId,
        url: u.url,
        name: u.name,
      })),
    );
  }

  revalidatePath(`/dashboard/image-sets/${setId}`);

  let message = `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded`;
  if (skipped.length > 0) {
    message += `. Skipped: ${skipped.join(", ")}`;
  }

  return { success: true, message };
}

// --- Delete Image ---

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

  // Verify ownership via image set
  const [set] = await db
    .select({ id: imageSet.id })
    .from(imageSet)
    .where(and(eq(imageSet.id, setId), eq(imageSet.userId, session.user.id)));

  if (!set) return { errors: { setId: ["Image set not found"] } };

  // Check if image is referenced by any puzzle
  const referencingPuzzles = await db
    .select({ id: puzzle.id, prompt: puzzle.prompt })
    .from(puzzle)
    .where(
      sql`${puzzle.correctImageIds}::jsonb @> ${JSON.stringify([imageId])}::jsonb
        OR (${puzzle.incorrectImageIds} IS NOT NULL AND ${puzzle.incorrectImageIds}::jsonb @> ${JSON.stringify([imageId])}::jsonb)`,
    );

  if (referencingPuzzles.length > 0) {
    return {
      errors: {
        imageId: [
          `This image is used by ${referencingPuzzles.length} puzzle${referencingPuzzles.length === 1 ? "" : "s"}. Remove it from those puzzles first.`,
        ],
      },
    };
  }

  // Get image URL for R2 deletion
  const [img] = await db
    .select({ id: image.id, url: image.url })
    .from(image)
    .where(and(eq(image.id, imageId), eq(image.imageSetId, setId)));

  if (!img) return { errors: { imageId: ["Image not found"] } };

  // Delete from R2
  const key = r2KeyFromUrl(img.url);
  await deleteFromR2(key);

  // Delete from database
  await db.delete(image).where(eq(image.id, imageId));

  revalidatePath(`/dashboard/image-sets/${setId}`);
  return { success: true, message: "Image deleted" };
}

// --- Delete Image Set ---

export async function deleteImageSet(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const setId = formData.get("setId") as string;

  if (!setId) return { errors: { setId: ["Missing set ID"] } };

  // Verify ownership
  const [set] = await db
    .select({ id: imageSet.id })
    .from(imageSet)
    .where(and(eq(imageSet.id, setId), eq(imageSet.userId, session.user.id)));

  if (!set) return { errors: { setId: ["Image set not found"] } };

  // Get all images for R2 cleanup
  const images = await db
    .select({ url: image.url })
    .from(image)
    .where(eq(image.imageSetId, setId));

  // Delete all from R2
  for (const img of images) {
    await deleteFromR2(r2KeyFromUrl(img.url));
  }

  // Cascade delete handles images in DB
  await db
    .delete(imageSet)
    .where(eq(imageSet.id, setId));

  redirect("/dashboard/image-sets");
}
