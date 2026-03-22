"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { site, puzzle } from "@/lib/db/app-schema";
import { and, eq } from "drizzle-orm";
import type { ActionState } from "@/lib/types";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";

const createPuzzleSchema = z
  .object({
    siteId: z.string().min(1, "Please select a site"),
    imageSetId: z.string().min(1, "Please select an image set"),
    prompt: z.string().min(1, "Prompt is required").max(200, "Prompt is too long"),
    correctImageIds: z
      .array(z.string())
      .min(1, "Select at least 1 correct image"),
    incorrectImageIds: z.array(z.string()).nullable(),
    correctCount: z.number().int().min(1).max(CAPTCHA_GRID_SIZE - 1),
    difficulty: z.number().min(0.1).max(1),
  })
  .refine(
    (data) => {
      // correctCount can't exceed the number of correct images tagged
      return data.correctCount <= data.correctImageIds.length;
    },
    {
      message: "Correct count per challenge cannot exceed total correct images",
      path: ["correctCount"],
    },
  );

export async function createPuzzle(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const raw = {
    siteId: formData.get("siteId") as string,
    imageSetId: formData.get("imageSetId") as string,
    prompt: formData.get("prompt") as string,
    correctImageIds: JSON.parse(
      (formData.get("correctImageIds") as string) || "[]",
    ),
    incorrectImageIds: formData.get("incorrectImageIds")
      ? JSON.parse(formData.get("incorrectImageIds") as string)
      : null,
    correctCount: Number(formData.get("correctCount")),
    difficulty: Number(formData.get("difficulty")),
  };

  const parsed = createPuzzleSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  // Verify site belongs to user
  const [siteData] = await db
    .select({ id: site.id })
    .from(site)
    .where(
      and(eq(site.id, parsed.data.siteId), eq(site.userId, session.user.id)),
    );

  if (!siteData) {
    return { errors: { siteId: ["Site not found"] } };
  }

  await db.insert(puzzle).values({
    siteId: parsed.data.siteId,
    imageSetId: parsed.data.imageSetId,
    prompt: parsed.data.prompt,
    correctImageIds: parsed.data.correctImageIds,
    incorrectImageIds: parsed.data.incorrectImageIds,
    correctCount: parsed.data.correctCount,
    difficulty: parsed.data.difficulty,
  });

  redirect(`/dashboard/sites/${parsed.data.siteId}`);
}
