"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { audio, image, imageSet, puzzle, site } from "@/lib/db/app-schema";
import type { ActionState } from "@/lib/types";
import { CAPTCHA_GRID_SIZE, CAPTCHA_MODES } from "@/lib/types";

const captchaModeEnum = z.enum(CAPTCHA_MODES);

const createPuzzleSchema = z
  .object({
    siteId: z.string().min(1, "Please select a site"),
    captchaMode: captchaModeEnum,
    // Image fields (required for image/combined)
    imageSetId: z.string(),
    prompt: z.string().max(200, "Prompt is too long"),
    correctImageIds: z.array(z.string()),
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
    // Audio fields (required for audio/combined)
    audioId: z.string().nullable(),
    audioAnswer: z.string().max(200).nullable(),
  })
  // Image validations only when mode needs images
  .refine(
    (data) => {
      if (data.captchaMode === "audio") return true;
      return data.imageSetId.length > 0;
    },
    { message: "Please select an image set", path: ["imageSetId"] },
  )
  .refine(
    (data) => {
      if (data.captchaMode === "audio") return true;
      return data.prompt.length > 0;
    },
    { message: "Prompt is required", path: ["prompt"] },
  )
  .refine(
    (data) => {
      if (data.captchaMode === "audio") return true;
      return data.correctImageIds.length > 0;
    },
    { message: "Select at least 1 correct image", path: ["correctImageIds"] },
  )
  .refine(
    (data) => {
      if (data.captchaMode === "audio") return true;
      return data.correctCount <= data.correctImageIds.length;
    },
    {
      message: "Correct count per challenge cannot exceed total correct images",
      path: ["correctCount"],
    },
  )
  .refine(
    (data) => {
      if (data.captchaMode === "audio") return true;
      return !data.correctCountMax || data.correctCountMax >= data.correctCount;
    },
    {
      message: "Max must be greater than or equal to min",
      path: ["correctCountMax"],
    },
  )
  .refine(
    (data) => {
      if (data.captchaMode === "audio") return true;
      return (
        !data.correctCountMax ||
        data.correctCountMax <= data.correctImageIds.length
      );
    },
    {
      message: "Max cannot exceed total correct images",
      path: ["correctCountMax"],
    },
  )
  // Audio validations only when mode needs audio
  .refine(
    (data) => {
      if (data.captchaMode === "image") return true;
      return !!data.audioId;
    },
    { message: "Please select an audio clip", path: ["audioId"] },
  )
  .refine(
    (data) => {
      if (data.captchaMode === "image") return true;
      return !!data.audioAnswer && data.audioAnswer.trim().length > 0;
    },
    { message: "Answer is required", path: ["audioAnswer"] },
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
    captchaMode: formData.get("captchaMode") as string,
    imageSetId: (formData.get("imageSetId") as string) || "",
    prompt: (formData.get("prompt") as string) || "",
    correctImageIds,
    incorrectImageIds,
    correctCount: Number(formData.get("correctCount")) || 3,
    correctCountMax: formData.get("correctCountMax")
      ? Number(formData.get("correctCountMax"))
      : null,
    difficulty: Number(formData.get("difficulty")) || 0.5,
    audioId: (formData.get("audioId") as string) || null,
    audioAnswer: (formData.get("audioAnswer") as string) || null,
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

  const needsImages = parsed.data.captchaMode !== "audio";
  const needsAudio = parsed.data.captchaMode !== "image";

  // Validate image set and images
  if (needsImages) {
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

    const allImageIds = [
      ...parsed.data.correctImageIds,
      ...(parsed.data.incorrectImageIds ?? []),
    ];
    if (allImageIds.length > 0) {
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
    }
  }

  // Validate audio ownership
  if (needsAudio && parsed.data.audioId) {
    const [audioData] = await db
      .select({ id: audio.id })
      .from(audio)
      .where(
        and(
          eq(audio.id, parsed.data.audioId),
          eq(audio.userId, session.user.id),
        ),
      );
    if (!audioData) {
      return { errors: { audioId: ["Audio clip not found"] } };
    }
  }

  await db.insert(puzzle).values({
    siteId: parsed.data.siteId,
    captchaMode: parsed.data.captchaMode,
    imageSetId: needsImages ? parsed.data.imageSetId : null,
    prompt: parsed.data.prompt,
    correctImageIds: needsImages ? parsed.data.correctImageIds : [],
    incorrectImageIds: needsImages ? parsed.data.incorrectImageIds : null,
    correctCount: parsed.data.correctCount,
    correctCountMax: parsed.data.correctCountMax,
    difficulty: parsed.data.difficulty,
    audioId: needsAudio ? parsed.data.audioId : null,
    audioAnswer: needsAudio ? parsed.data.audioAnswer : null,
  });

  redirect(`/dashboard/sites/${parsed.data.siteId}`);
}
