"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { puzzle, site } from "@/lib/db/app-schema";
import { and, eq } from "drizzle-orm";
import type { ActionState } from "@/lib/types";
import { CAPTCHA_MAX_CORRECT, CAPTCHA_GRID_SIZE } from "@/lib/types";

/** Verify puzzle belongs to user via site ownership */
async function requireOwnedPuzzle(puzzleId: string, userId: string) {
  const [row] = await db
    .select({ id: puzzle.id })
    .from(puzzle)
    .innerJoin(site, and(eq(site.id, puzzle.siteId), eq(site.userId, userId)))
    .where(eq(puzzle.id, puzzleId));
  return row ?? null;
}

// --- Update Puzzle ---

const updatePuzzleSchema = z
  .object({
    puzzleId: z.string().min(1),
    prompt: z.string().min(1, "Prompt is required").max(200, "Prompt is too long"),
    correctImageIds: z
      .array(z.string())
      .min(1, "Select at least 1 correct image")
      .max(CAPTCHA_MAX_CORRECT, `Maximum ${CAPTCHA_MAX_CORRECT} correct images`),
    incorrectImageIds: z.array(z.string()).nullable(),
    difficulty: z.number().min(0.1).max(1),
  })
  .refine(
    (data) => {
      if (!data.incorrectImageIds) return true;
      const needed = CAPTCHA_GRID_SIZE - data.correctImageIds.length;
      return data.incorrectImageIds.length >= needed;
    },
    {
      message: `Hand-picked incorrect images must fill the remaining grid slots`,
      path: ["incorrectImageIds"],
    },
  );

export async function updatePuzzle(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const raw = {
    puzzleId: formData.get("puzzleId") as string,
    prompt: formData.get("prompt") as string,
    correctImageIds: JSON.parse(
      (formData.get("correctImageIds") as string) || "[]",
    ),
    incorrectImageIds: formData.get("incorrectImageIds")
      ? JSON.parse(formData.get("incorrectImageIds") as string)
      : null,
    difficulty: Number(formData.get("difficulty")),
  };

  const parsed = updatePuzzleSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const owned = await requireOwnedPuzzle(parsed.data.puzzleId, session.user.id);
  if (!owned) {
    return { errors: { puzzleId: ["Puzzle not found"] } };
  }

  await db
    .update(puzzle)
    .set({
      prompt: parsed.data.prompt,
      correctImageIds: parsed.data.correctImageIds,
      incorrectImageIds: parsed.data.incorrectImageIds,
      difficulty: parsed.data.difficulty,
    })
    .where(eq(puzzle.id, parsed.data.puzzleId));

  revalidatePath(`/dashboard/puzzles/${parsed.data.puzzleId}`);
  return { success: true, message: "Puzzle updated" };
}

// --- Delete Puzzle ---

export async function deletePuzzle(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const puzzleId = formData.get("puzzleId") as string;

  if (!puzzleId) return { errors: { puzzleId: ["Missing puzzle ID"] } };

  const owned = await requireOwnedPuzzle(puzzleId, session.user.id);
  if (!owned) {
    return { errors: { puzzleId: ["Puzzle not found"] } };
  }

  await db.delete(puzzle).where(eq(puzzle.id, puzzleId));

  redirect("/dashboard/puzzles");
}
