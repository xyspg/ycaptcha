"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db, withUserLock } from "@/lib/db";
import { audio, puzzle, site } from "@/lib/db/app-schema";
import {
  cleanupR2Keys,
  deleteFromR2,
  hashBuffer,
  r2KeyFromUrl,
  uploadAudioToR2,
} from "@/lib/r2";
import {
  checkQuota,
  getUserStorageUsage,
  QuotaExceededError,
} from "@/lib/storage-quota";
import type { ActionState } from "@/lib/types";
import { parseWav } from "@/lib/wav";

export type { ActionState } from "@/lib/types";

export interface ReferencingPuzzle {
  puzzleId: string;
  puzzlePrompt: string;
  siteId: string;
  siteName: string;
}

async function requireOwnedAudio(audioId: string, userId: string) {
  const [row] = await db
    .select({ id: audio.id, url: audio.url })
    .from(audio)
    .where(and(eq(audio.id, audioId), eq(audio.userId, userId)));
  return row ?? null;
}

// Client renders ≤10s mono 44.1kHz 16-bit WAV (~880KB). 3MB clears the
// theoretical ceiling for any legal config parseWav accepts (10s stereo
// 48kHz ≈ 1.92MB) with headroom to spare.
const MAX_FILE_SIZE = 3 * 1024 * 1024;
const MAX_DURATION_MS = 10_500; // 10s plus a small tolerance

export async function uploadAudio(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string)?.trim();

  if (!file || file.size === 0) {
    return { errors: { file: ["No file selected"] } };
  }
  if (!name || name.length === 0) {
    return { errors: { name: ["Name is required"] } };
  }
  if (name.length > 100) {
    return { errors: { name: ["Name is too long"] } };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { errors: { file: ["File exceeds 3MB limit"] } };
  }

  const arrayBuffer = await file.arrayBuffer();

  // Decode the WAV ourselves rather than trusting MIME or the client's
  // durationMs — that's the only way to guarantee uploads stay within
  // the 10s cap regardless of what the form claims.
  let wav: ReturnType<typeof parseWav>;
  try {
    wav = parseWav(arrayBuffer);
  } catch {
    return { errors: { file: ["File must be a 16-bit PCM WAV"] } };
  }
  if (wav.durationMs > MAX_DURATION_MS) {
    return { errors: { file: ["Audio must be 10 seconds or shorter"] } };
  }
  const durationMs = wav.durationMs;

  const buffer = Buffer.from(arrayBuffer);
  const sizeBytes = buffer.length;
  const contentHash = hashBuffer(buffer);

  // Check dedup for this user (no quota impact — safe outside the lock)
  const [existing] = await db
    .select({ id: audio.id })
    .from(audio)
    .where(
      and(
        eq(audio.userId, session.user.id),
        eq(audio.contentHash, contentHash),
      ),
    )
    .limit(1);

  if (existing) {
    return { errors: { file: ["This audio file has already been uploaded"] } };
  }

  let uploadedKey: string | null = null;
  let createdId: string;
  try {
    createdId = await withUserLock(session.user.id, async (tx) => {
      const usage = await getUserStorageUsage(session.user.id, tx);
      const quotaErr = checkQuota(usage, sizeBytes);
      if (quotaErr) throw new QuotaExceededError(quotaErr);

      const { key, url } = await uploadAudioToR2(buffer, "wav");
      uploadedKey = key;

      const [created] = await tx
        .insert(audio)
        .values({
          userId: session.user.id,
          url,
          name,
          durationMs,
          contentHash,
          sizeBytes,
        })
        .returning({ id: audio.id });
      return created.id;
    });
  } catch (err) {
    await cleanupR2Keys([uploadedKey]);
    if (err instanceof QuotaExceededError) {
      return { errors: { file: [err.message] } };
    }
    throw err;
  }

  revalidatePath("/dashboard/audio");
  return { success: true, values: { id: createdId } };
}

const updateSchema = z.object({
  audioId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export async function updateAudio(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = updateSchema.safeParse({
    audioId: formData.get("audioId"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const result = await db
    .update(audio)
    .set({ name: parsed.data.name })
    .where(
      and(eq(audio.id, parsed.data.audioId), eq(audio.userId, session.user.id)),
    )
    .returning();

  if (result.length === 0) {
    return { errors: { audioId: ["Audio not found"] } };
  }

  revalidatePath(`/dashboard/audio/${parsed.data.audioId}`);
  revalidatePath("/dashboard/audio");
  return { success: true, message: "Updated" };
}

export type DeleteAudioResult =
  | (NonNullable<ActionState> & { referencingPuzzles?: ReferencingPuzzle[] })
  | null;

export async function deleteAudio(
  prevState: DeleteAudioResult,
  formData: FormData,
): Promise<DeleteAudioResult> {
  const session = await requireSession();
  const audioId = formData.get("audioId") as string;

  if (!audioId) return { errors: { audioId: ["Missing audio ID"] } };

  const row = await requireOwnedAudio(audioId, session.user.id);
  if (!row) return { errors: { audioId: ["Audio not found"] } };

  const referencingPuzzles = await db
    .select({
      puzzleId: puzzle.id,
      puzzlePrompt: puzzle.prompt,
      siteId: site.id,
      siteName: site.name,
    })
    .from(puzzle)
    .innerJoin(site, eq(site.id, puzzle.siteId))
    .where(eq(puzzle.audioId, audioId));

  if (referencingPuzzles.length > 0) {
    return {
      errors: {
        audioId: [
          "This audio is used by one or more puzzles. Remove it from those puzzles first.",
        ],
      },
      referencingPuzzles,
    };
  }

  // DB first, R2 second. A concurrent Promise.all would either leak R2
  // bytes (DB succeeded, R2 threw) or leave a dead-URL DB row (R2
  // succeeded, DB threw). DB-first means the worst case is a benign
  // byte orphan that gets logged.
  await db.delete(audio).where(eq(audio.id, audioId));
  try {
    await deleteFromR2(r2KeyFromUrl(row.url));
  } catch (err) {
    console.warn(`R2 cleanup failed for audio ${audioId}:`, err);
  }

  redirect("/dashboard/audio");
}
