import { zValidator } from "@hono/zod-validator";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db, withUserLock } from "../lib/db";
import { image, imageSet, puzzle, site } from "../lib/db/app-schema";
import {
  cleanupS3Keys,
  deleteFromS3,
  processImage,
  s3KeyFromUrl,
  uploadBufferToS3,
} from "../lib/s3";
import {
  checkQuota,
  getUserStorageUsage,
  QuotaExceededError,
  STORAGE_QUOTA_BYTES,
} from "../lib/storage-quota";
import { galleryItemHashRefs } from "../lib/storage-refcount";
import { type AuthVariables, requireSession } from "../middleware/auth";
import {
  createImageSetSchema,
  updateImageSetSchema,
} from "../schemas/image-sets";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 50;

async function requireOwnedSet(setId: string, userId: string) {
  const [set] = await db
    .select({ id: imageSet.id })
    .from(imageSet)
    .where(and(eq(imageSet.id, setId), eq(imageSet.userId, userId)));
  return set ?? null;
}

const imageSets = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireSession)
  .get("/", async (c) => {
    const user = c.get("user");
    const rows = await db
      .select()
      .from(imageSet)
      .where(eq(imageSet.userId, user.id))
      .orderBy(imageSet.createdAt);
    return c.json({ imageSets: rows });
  })
  .get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const [setRow] = await db
      .select()
      .from(imageSet)
      .where(and(eq(imageSet.id, id), eq(imageSet.userId, user.id)));
    if (!setRow) return c.json({ error: "Image set not found" }, 404);
    const images = await db
      .select()
      .from(image)
      .where(eq(image.imageSetId, id))
      .orderBy(image.createdAt);
    return c.json({ imageSet: setRow, images });
  })
  .post("/", zValidator("json", createImageSetSchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");
    const [created] = await db
      .insert(imageSet)
      .values({ userId: user.id, name: data.name })
      .returning();
    return c.json({ imageSet: created, message: "Image set created" }, 201);
  })
  .patch("/:id", zValidator("json", updateImageSetSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const [updated] = await db
      .update(imageSet)
      .set({ name: data.name })
      .where(and(eq(imageSet.id, id), eq(imageSet.userId, user.id)))
      .returning();
    if (!updated) return c.json({ error: "Image set not found" }, 404);
    return c.json({ imageSet: updated, message: "Name updated" });
  })
  .post("/:id/images", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    const set = await requireOwnedSet(id, user.id);
    if (!set) return c.json({ error: "Image set not found" }, 404);

    const body = await c.req.parseBody({ all: true });
    const raw = body.files;
    const files: File[] = Array.isArray(raw)
      ? raw.filter((f): f is File => f instanceof File)
      : raw instanceof File
        ? [raw]
        : [];

    if (files.length === 0) {
      return c.json({ error: "No files selected" }, 400);
    }
    if (files.length > MAX_FILES) {
      return c.json({ error: `Maximum ${MAX_FILES} files at a time` }, 400);
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
      const f = validFiles[i];
      if (!r || !f) continue;
      if (r.status === "fulfilled") {
        processed.push(r.value);
      } else {
        skipped.push(`${f.name} (invalid image)`);
      }
    }

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
                    eq(image.imageSetId, id),
                    inArray(image.contentHash, hashes),
                  ),
                )
            ).map((r) => r.contentHash),
          )
        : new Set<string>();

    const newHashes = hashes.filter((h) => !existingInSet.has(h));
    const crossSetRows =
      newHashes.length > 0
        ? await db
            .select({ contentHash: image.contentHash, url: image.url })
            .from(image)
            .where(inArray(image.contentHash, newHashes))
        : [];
    const crossSetMap = new Map(
      crossSetRows.map((e) => [e.contentHash, e.url]),
    );

    // Drop hashes that already live in the set, AND collapse duplicates
    // *within this batch* — a drag-and-drop with the same file twice would
    // otherwise hit the (image_set_id, content_hash) unique constraint and
    // fail the whole insert.
    const seenInBatch = new Set<string>();
    const newProcessed: typeof processed = [];
    for (const p of processed) {
      if (existingInSet.has(p.contentHash)) continue;
      if (seenInBatch.has(p.contentHash)) continue;
      seenInBatch.add(p.contentHash);
      newProcessed.push(p);
    }
    const dupeCount = processed.length - newProcessed.length;
    if (dupeCount > 0) {
      skipped.push(
        `${dupeCount} duplicate${dupeCount === 1 ? "" : "s"} already in set`,
      );
    }

    const newlyUploadedKeys: string[] = [];
    let uploadedCount: number;
    try {
      uploadedCount = await withUserLock(user.id, async (tx) => {
        const usage = await getUserStorageUsage(user.id, tx);
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
            const { key, url } = await uploadBufferToS3(buffer);
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
              imageSetId: id,
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
      await cleanupS3Keys(newlyUploadedKeys);
      throw err;
    }

    let message = `${uploadedCount} image${uploadedCount === 1 ? "" : "s"} uploaded`;
    if (skipped.length > 0) message += `. Skipped: ${skipped.join(", ")}`;

    return c.json({ uploadedCount, skipped, message });
  })
  .post("/:id/images/single", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    const set = await requireOwnedSet(id, user.id);
    if (!set) return c.json({ error: "Image set not found" }, 404);

    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) {
      return c.json({ error: "Missing file" }, 400);
    }
    const name = file.name;

    let buffer: Buffer;
    let contentHash: string;
    try {
      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const result = await processImage(rawBuffer);
      buffer = result.buffer;
      contentHash = result.contentHash;
    } catch {
      return c.json({ status: "error", name, error: "Invalid image" }, 400);
    }

    const [existing] = await db
      .select({ id: image.id })
      .from(image)
      .where(and(eq(image.imageSetId, id), eq(image.contentHash, contentHash)))
      .limit(1);
    if (existing) {
      return c.json({ status: "duplicate", name });
    }

    let uploadedKey: string | null = null;
    try {
      await withUserLock(user.id, async (tx) => {
        const usage = await getUserStorageUsage(user.id, tx);
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
          const uploaded = await uploadBufferToS3(buffer);
          url = uploaded.url;
          uploadedKey = uploaded.key;
        }

        await tx.insert(image).values({
          imageSetId: id,
          url,
          name,
          contentHash,
          sizeBytes: buffer.length,
        });
      });
    } catch (err) {
      await cleanupS3Keys([uploadedKey]);
      if (err instanceof QuotaExceededError) {
        return c.json({ status: "quota", name }, 413);
      }
      throw err;
    }

    return c.json({ status: "ok", name });
  })
  .delete("/:id/images/:imageId", async (c) => {
    const user = c.get("user");
    const setId = c.req.param("id");
    const imageId = c.req.param("imageId");

    const set = await requireOwnedSet(setId, user.id);
    if (!set) return c.json({ error: "Image set not found" }, 404);

    const [ref] = await db
      .select({ id: puzzle.id })
      .from(puzzle)
      .innerJoin(
        site,
        and(eq(site.id, puzzle.siteId), eq(site.userId, user.id)),
      )
      .where(
        sql`${puzzle.correctImageIds}::jsonb @> ${JSON.stringify([imageId])}::jsonb
        OR (${puzzle.incorrectImageIds} IS NOT NULL AND ${puzzle.incorrectImageIds}::jsonb @> ${JSON.stringify([imageId])}::jsonb)`,
      )
      .limit(1);

    if (ref) {
      return c.json(
        {
          error:
            "This image is used by a puzzle. Remove it from the puzzle first.",
        },
        409,
      );
    }

    const result = await withUserLock(user.id, async (tx) => {
      const [img] = await tx
        .select({
          id: image.id,
          url: image.url,
          contentHash: image.contentHash,
        })
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

    if (!result) return c.json({ error: "Image not found" }, 404);

    if (result.purge) {
      try {
        await deleteFromS3(s3KeyFromUrl(result.url));
      } catch (err) {
        console.warn(`S3 cleanup failed for image ${imageId}:`, err);
      }
    }

    return c.json({ message: "Image deleted" });
  })
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const setId = c.req.param("id");

    const set = await requireOwnedSet(setId, user.id);
    if (!set) return c.json({ error: "Image set not found" }, 404);

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
        and(eq(site.id, puzzle.siteId), eq(site.userId, user.id)),
      )
      .where(eq(puzzle.imageSetId, setId));

    if (referencingPuzzles.length > 0) {
      return c.json(
        {
          error:
            "This image set is used by one or more puzzles. Remove those puzzles first.",
          referencingPuzzles,
        },
        409,
      );
    }

    const { imgs, imageRefs, galleryRefs } = await withUserLock(
      user.id,
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

    const toDelete = imgs.filter(
      (img) =>
        img.contentHash === null ||
        (!imageRefs.has(img.contentHash) && !galleryRefs.has(img.contentHash)),
    );

    const results = await Promise.allSettled(
      toDelete.map((img) => deleteFromS3(s3KeyFromUrl(img.url))),
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const t = toDelete[i];
      if (r && r.status === "rejected" && t) {
        console.warn(
          `S3 cleanup failed for image set ${setId} key ${t.url}:`,
          (r as PromiseRejectedResult).reason,
        );
      }
    }

    return c.json({ message: "Image set deleted" });
  });

export { imageSets };
