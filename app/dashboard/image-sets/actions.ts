"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { imageSet, image, puzzle } from "@/lib/db/app-schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { uploadBufferToR2, deleteFromR2, r2KeyFromUrl, processImage } from "@/lib/r2";
import { SAMPLE_SETS } from "@/lib/samples";
import type { ActionState } from "@/lib/types";

export type { ActionState } from "@/lib/types";

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

  // deduplicate: skip upload if content hash already exists
  const hashes = processed.map((p) => p.contentHash);
  const existingRows = hashes.length > 0
    ? await db
        .select({ contentHash: image.contentHash, url: image.url })
        .from(image)
        .where(inArray(image.contentHash, hashes))
    : [];
  const existingMap = new Map(existingRows.map((e) => [e.contentHash, e.url]));

  const results = await Promise.allSettled(
    processed.map(async ({ file, buffer, contentHash }) => {
      const existingUrl = existingMap.get(contentHash);
      if (existingUrl) {
        return { url: existingUrl, name: file.name, contentHash };
      }
      const { url } = await uploadBufferToR2(buffer);
      return { url, name: file.name, contentHash };
    }),
  );

  const uploaded = results
    .filter((r): r is PromiseFulfilledResult<{ url: string; name: string; contentHash: string }> => r.status === "fulfilled")
    .map((r) => r.value);

  if (uploaded.length > 0) {
    await db
      .insert(image)
      .values(
        uploaded.map((u) => ({
          imageSetId: setId,
          url: u.url,
          name: u.name,
          contentHash: u.contentHash,
        })),
      )
      .onConflictDoNothing({ target: image.contentHash });
  }

  revalidatePath(`/dashboard/image-sets/${setId}`);

  let message = `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded`;
  if (skipped.length > 0) {
    message += `. Skipped: ${skipped.join(", ")}`;
  }

  return { success: true, message };
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

  // can't delete images that puzzles depend on
  const [ref] = await db
    .select({ id: puzzle.id })
    .from(puzzle)
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

  const [img] = await db
    .select({ id: image.id, url: image.url, contentHash: image.contentHash })
    .from(image)
    .where(and(eq(image.id, imageId), eq(image.imageSetId, setId)));

  if (!img) return { errors: { imageId: ["Image not found"] } };

  await db.delete(image).where(eq(image.id, imageId));

  // only delete from R2 if no other rows share the same content hash
  if (img.contentHash) {
    const [ref] = await db
      .select({ id: image.id })
      .from(image)
      .where(eq(image.contentHash, img.contentHash))
      .limit(1);
    if (!ref) {
      await deleteFromR2(r2KeyFromUrl(img.url));
    }
  } else {
    await deleteFromR2(r2KeyFromUrl(img.url));
  }

  revalidatePath(`/dashboard/image-sets/${setId}`);
  return { success: true, message: "Image deleted" };
}


export async function deleteImageSet(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const setId = formData.get("setId") as string;

  if (!setId) return { errors: { setId: ["Missing set ID"] } };

  const set = await requireOwnedSet(setId, session.user.id);
  if (!set) return { errors: { setId: ["Image set not found"] } };

  const imgs = await db
    .select({ url: image.url, contentHash: image.contentHash })
    .from(image)
    .where(eq(image.imageSetId, setId));

  // cascade handles image rows; clean up R2 for orphaned content hashes
  await db.delete(imageSet).where(eq(imageSet.id, setId));
  const hashesToCheck = imgs
    .map((i) => i.contentHash)
    .filter((h): h is string => h !== null);

  const stillReferenced = hashesToCheck.length > 0
    ? new Set(
        (await db
          .select({ contentHash: image.contentHash })
          .from(image)
          .where(inArray(image.contentHash, hashesToCheck))
        ).map((r) => r.contentHash),
      )
    : new Set<string>();

  await Promise.allSettled(
    imgs
      .filter((img) => !stillReferenced.has(img.contentHash))
      .map((img) => deleteFromR2(r2KeyFromUrl(img.url))),
  );

  redirect("/dashboard/image-sets");
}


const importSampleSchema = z.object({
  slug: z.string().min(1),
});

export async function importSampleSet(slug: string): Promise<void> {
  const session = await requireSession();

  const parsed = importSampleSchema.safeParse({ slug });
  if (!parsed.success) throw new Error("Invalid input");

  const sample = SAMPLE_SETS.find((s) => s.slug === parsed.data.slug);
  if (!sample) throw new Error("Unknown sample set");

  const [created] = await db
    .insert(imageSet)
    .values({
      userId: session.user.id,
      name: sample.displayName,
    })
    .returning({ id: imageSet.id });

  await db.insert(image).values(
    sample.images.map((img) => ({
      imageSetId: created.id,
      url: img.url,
      name: img.name,
      contentHash: img.contentHash,
    })),
  );

  redirect(`/dashboard/image-sets/${created.id}`);
}
