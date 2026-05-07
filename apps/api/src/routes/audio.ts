import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db, withUserLock } from "../lib/db";
import { audio, puzzle, site } from "../lib/db/app-schema";
import {
  cleanupS3Keys,
  deleteFromS3,
  hashBuffer,
  s3KeyFromUrl,
  uploadAudioToS3,
} from "../lib/s3";
import {
  checkQuota,
  getUserStorageUsage,
  QuotaExceededError,
} from "../lib/storage-quota";
import { parseWav } from "../lib/wav";
import { type AuthVariables, requireSession } from "../middleware/auth";
import { updateAudioSchema } from "../schemas/audio";

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const MAX_DURATION_MS = 10_500;

async function requireOwnedAudio(audioId: string, userId: string) {
  const [row] = await db
    .select({ id: audio.id, url: audio.url })
    .from(audio)
    .where(and(eq(audio.id, audioId), eq(audio.userId, userId)));
  return row ?? null;
}

const audioRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireSession)
  .get("/", async (c) => {
    const user = c.get("user");
    const rows = await db
      .select()
      .from(audio)
      .where(eq(audio.userId, user.id))
      .orderBy(audio.createdAt);
    return c.json({ audio: rows });
  })
  .get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const [row] = await db
      .select()
      .from(audio)
      .where(and(eq(audio.id, id), eq(audio.userId, user.id)));
    if (!row) return c.json({ error: "Audio not found" }, 404);
    return c.json({ audio: row });
  })
  .post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.parseBody();
    const file = body.file;
    const rawName = body.name;

    if (!(file instanceof File) || file.size === 0) {
      return c.json({ error: "No file selected" }, 400);
    }
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) return c.json({ error: "Name is required" }, 400);
    if (name.length > 100) return c.json({ error: "Name is too long" }, 400);
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: "File exceeds 3MB limit" }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    let wav: ReturnType<typeof parseWav>;
    try {
      wav = parseWav(arrayBuffer);
    } catch {
      return c.json({ error: "File must be a 16-bit PCM WAV" }, 400);
    }
    if (wav.durationMs > MAX_DURATION_MS) {
      return c.json({ error: "Audio must be 10 seconds or shorter" }, 400);
    }
    const durationMs = wav.durationMs;

    const buffer = Buffer.from(arrayBuffer);
    const sizeBytes = buffer.length;
    const contentHash = hashBuffer(buffer);

    const [existing] = await db
      .select({ id: audio.id })
      .from(audio)
      .where(and(eq(audio.userId, user.id), eq(audio.contentHash, contentHash)))
      .limit(1);
    if (existing) {
      return c.json(
        { error: "This audio file has already been uploaded" },
        409,
      );
    }

    let uploadedKey: string | null = null;
    let createdId: string;
    try {
      createdId = await withUserLock(user.id, async (tx) => {
        const usage = await getUserStorageUsage(user.id, tx);
        const quotaErr = checkQuota(usage, sizeBytes);
        if (quotaErr) throw new QuotaExceededError(quotaErr);

        const { key, url } = await uploadAudioToS3(buffer, "wav");
        uploadedKey = key;

        const [created] = await tx
          .insert(audio)
          .values({
            userId: user.id,
            url,
            name,
            durationMs,
            contentHash,
            sizeBytes,
          })
          .returning({ id: audio.id });
        if (!created) throw new Error("Failed to insert audio row");
        return created.id;
      });
    } catch (err) {
      await cleanupS3Keys([uploadedKey]);
      if (err instanceof QuotaExceededError) {
        return c.json({ error: err.message }, 413);
      }
      throw err;
    }

    return c.json({ audio: { id: createdId }, message: "Uploaded" }, 201);
  })
  .patch("/:id", zValidator("json", updateAudioSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const data = c.req.valid("json");

    const [updated] = await db
      .update(audio)
      .set({ name: data.name })
      .where(and(eq(audio.id, id), eq(audio.userId, user.id)))
      .returning();
    if (!updated) return c.json({ error: "Audio not found" }, 404);
    return c.json({ audio: updated, message: "Updated" });
  })
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    const row = await requireOwnedAudio(id, user.id);
    if (!row) return c.json({ error: "Audio not found" }, 404);

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
      .where(eq(puzzle.audioId, id));

    if (referencingPuzzles.length > 0) {
      return c.json(
        {
          error:
            "This audio is used by one or more puzzles. Remove it from those puzzles first.",
          referencingPuzzles,
        },
        409,
      );
    }

    await db.delete(audio).where(eq(audio.id, id));
    try {
      await deleteFromS3(s3KeyFromUrl(row.url));
    } catch (err) {
      console.warn(`S3 cleanup failed for audio ${id}:`, err);
    }
    return c.json({ message: "Audio deleted" });
  });

export { audioRoute };
