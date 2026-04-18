"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { image, imageSet, puzzle, site } from "@/lib/db/app-schema";
import {
  deleteFromR2,
  processImage,
  r2KeyFromUrl,
  uploadBufferToR2,
} from "@/lib/r2";
import { SAMPLE_SETS } from "@/lib/samples";
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

  const results = await Promise.allSettled(
    newProcessed.map(async ({ file, buffer, contentHash }) => {
      const existingUrl = crossSetMap.get(contentHash);
      if (existingUrl) {
        return {
          url: existingUrl,
          name: file.name,
          contentHash,
          uploadedKey: null as string | null,
        };
      }
      const { key, url } = await uploadBufferToR2(buffer);
      return { url, name: file.name, contentHash, uploadedKey: key };
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
        uploadedKey: string | null;
      }> => r.status === "fulfilled",
    )
    .map((r) => r.value);

  if (uploaded.length > 0) {
    try {
      await db.insert(image).values(
        uploaded.map((u) => ({
          imageSetId: setId,
          url: u.url,
          name: u.name,
          contentHash: u.contentHash,
        })),
      );
    } catch (err) {
      const newKeys = uploaded
        .map((u) => u.uploadedKey)
        .filter((k): k is string => !!k);
      await Promise.allSettled(newKeys.map((k) => deleteFromR2(k)));
      throw err;
    }
  }

  revalidatePath(`/dashboard/image-sets/${setId}`);

  let message = `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded`;
  if (skipped.length > 0) {
    message += `. Skipped: ${skipped.join(", ")}`;
  }

  return { success: true, message };
}

export type UploadSingleResult =
  | { status: "ok"; name: string }
  | { status: "duplicate"; name: string }
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

  // Check duplicate in this set
  const [existing] = await db
    .select({ id: image.id })
    .from(image)
    .where(and(eq(image.imageSetId, setId), eq(image.contentHash, contentHash)))
    .limit(1);

  if (existing) {
    return { status: "duplicate", name };
  }

  // Check cross-set dedup for R2 reuse
  const [crossSet] = await db
    .select({ url: image.url })
    .from(image)
    .where(eq(image.contentHash, contentHash))
    .limit(1);

  let uploadedKey: string | null = null;
  let url: string;
  if (crossSet) {
    url = crossSet.url;
  } else {
    const uploaded = await uploadBufferToR2(buffer);
    url = uploaded.url;
    uploadedKey = uploaded.key;
  }

  try {
    await db.insert(image).values({
      imageSetId: setId,
      url,
      name,
      contentHash,
    });
  } catch (err) {
    if (uploadedKey) {
      await deleteFromR2(uploadedKey).catch(() => {});
    }
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
  // ignore sample images
  const isSample = img.url.includes("/samples/");
  if (!isSample) {
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
    .innerJoin(site, eq(site.id, puzzle.siteId))
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

  const imgs = await db
    .select({ url: image.url, contentHash: image.contentHash })
    .from(image)
    .where(eq(image.imageSetId, setId));

  await db.delete(imageSet).where(eq(imageSet.id, setId));
  const hashesToCheck = imgs
    .map((i) => i.contentHash)
    .filter((h): h is string => h !== null);

  const stillReferenced =
    hashesToCheck.length > 0
      ? new Set(
          (
            await db
              .select({ contentHash: image.contentHash })
              .from(image)
              .where(inArray(image.contentHash, hashesToCheck))
          ).map((r) => r.contentHash),
        )
      : new Set<string>();

  await Promise.allSettled(
    imgs
      .filter((img) => img.contentHash !== null)
      .filter((img) => !stillReferenced.has(img.contentHash))
      .filter((img) => !img.url.includes("/samples/"))
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

  await db
    .insert(image)
    .values(
      sample.images.map((img) => ({
        imageSetId: created.id,
        url: img.url,
        name: img.name,
        contentHash: img.contentHash,
      })),
    )
    .onConflictDoNothing({
      target: [image.imageSetId, image.contentHash],
    });
}
