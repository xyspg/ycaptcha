"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { image, imageSet, puzzle, site } from "@/lib/db/app-schema";
import type { ActionState } from "@/lib/types";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";

const createPuzzleSchema = z
  .object({
    siteId: z.string().min(1, "Please select a site"),
    imageSetId: z.string().min(1, "Please select an image set"),
    prompt: z
      .string()
      .min(1, "Prompt is required")
      .max(200, "Prompt is too long"),
    correctImageIds: z
      .array(z.string())
      .min(1, "Select at least 1 correct image"),
    incorrectImageIds: z.array(z.string()).nullable(),
    correctCount: z
      .number()
      .int()
      .min(1)
      .max(CAPTCHA_GRID_SIZE - 1),
    correctCountMax: z
      .number()
      .int()
      .min(1)
      .max(CAPTCHA_GRID_SIZE - 1)
      .nullable(),
    difficulty: z.number().min(0.1).max(1),
  })
  .refine((data) => data.correctCount <= data.correctImageIds.length, {
    message: "Correct count per challenge cannot exceed total correct images",
    path: ["correctCount"],
  })
  .refine(
    (data) =>
      !data.correctCountMax || data.correctCountMax >= data.correctCount,
    {
      message: "Max must be greater than or equal to min",
      path: ["correctCountMax"],
    },
  )
  .refine(
    (data) =>
      !data.correctCountMax ||
      data.correctCountMax <= data.correctImageIds.length,
    {
      message: "Max cannot exceed total correct images",
      path: ["correctCountMax"],
    },
  );

export async function createPuzzle(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  let correctImageIds: string[];
  let incorrectImageIds: string[] | null;
  try {
    correctImageIds = JSON.parse(
      (formData.get("correctImageIds") as string) || "[]",
    );
    incorrectImageIds = formData.get("incorrectImageIds")
      ? JSON.parse(formData.get("incorrectImageIds") as string)
      : null;
  } catch {
    return { errors: { correctImageIds: ["Invalid format"] } };
  }

  const raw = {
    siteId: formData.get("siteId") as string,
    imageSetId: formData.get("imageSetId") as string,
    prompt: formData.get("prompt") as string,
    correctImageIds,
    incorrectImageIds,
    correctCount: Number(formData.get("correctCount")),
    correctCountMax: formData.get("correctCountMax")
      ? Number(formData.get("correctCountMax"))
      : null,
    difficulty: Number(formData.get("difficulty")),
  };

  const parsed = createPuzzleSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const [siteData] = await db
    .select({ id: site.id })
    .from(site)
    .where(
      and(eq(site.id, parsed.data.siteId), eq(site.userId, session.user.id)),
    );

  if (!siteData) {
    return { errors: { siteId: ["Site not found"] } };
  }

  const [setData] = await db
    .select({ id: imageSet.id })
    .from(imageSet)
    .where(
      and(
        eq(imageSet.id, parsed.data.imageSetId),
        eq(imageSet.userId, session.user.id),
      ),
    );

  if (!setData) {
    return { errors: { imageSetId: ["Image set not found"] } };
  }

  // validate all image IDs belong to the selected imageSet
  const allImageIds = [
    ...parsed.data.correctImageIds,
    ...(parsed.data.incorrectImageIds ?? []),
  ];
  const validImages = await db
    .select({ id: image.id })
    .from(image)
    .where(
      and(
        eq(image.imageSetId, parsed.data.imageSetId),
        inArray(image.id, allImageIds),
      ),
    );
  if (validImages.length !== new Set(allImageIds).size) {
    return {
      errors: {
        correctImageIds: [
          "Some images do not belong to the selected image set",
        ],
      },
    };
  }

  await db.insert(puzzle).values({
    siteId: parsed.data.siteId,
    imageSetId: parsed.data.imageSetId,
    prompt: parsed.data.prompt,
    correctImageIds: parsed.data.correctImageIds,
    incorrectImageIds: parsed.data.incorrectImageIds,
    correctCount: parsed.data.correctCount,
    correctCountMax: parsed.data.correctCountMax,
    difficulty: parsed.data.difficulty,
  });

  redirect(`/dashboard/sites/${parsed.data.siteId}`);
}
