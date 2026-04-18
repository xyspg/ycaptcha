"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { audio, puzzle, site } from "@/lib/db/app-schema";
import {
  deleteFromR2,
  hashBuffer,
  r2KeyFromUrl,
  uploadAudioToR2,
} from "@/lib/r2";
import type { ActionState } from "@/lib/types";

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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadAudio(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string)?.trim();
  const durationMs = Number(formData.get("durationMs")) || null;

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
    return { errors: { file: ["File exceeds 10MB limit"] } };
  }
  if (!file.type.startsWith("audio/")) {
    return { errors: { file: ["File must be an audio file"] } };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentHash = hashBuffer(buffer);

  // Check dedup for this user
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

  // Trim flow always re-encodes to WAV before this point.
  const { key, url } = await uploadAudioToR2(buffer, "wav");

  let created: { id: string };
  try {
    [created] = await db
      .insert(audio)
      .values({
        userId: session.user.id,
        url,
        name,
        durationMs,
        contentHash,
      })
      .returning({ id: audio.id });
  } catch (err) {
    await deleteFromR2(key).catch(() => {});
    throw err;
  }

  revalidatePath("/dashboard/audio");
  return { success: true, values: { id: created.id } };
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

  await Promise.all([
    db.delete(audio).where(eq(audio.id, audioId)),
    deleteFromR2(r2KeyFromUrl(row.url)),
  ]);

  redirect("/dashboard/audio");
}
