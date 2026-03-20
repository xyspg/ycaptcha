"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { site, puzzle } from "@/lib/db/app-schema";
import { and, eq } from "drizzle-orm";

const createPuzzleSchema = z.object({
  siteId: z.string().min(1),
  imageSetId: z.string().min(1, "Please select an image set"),
  prompt: z.string().min(1, "Prompt is required").max(200, "Prompt is too long"),
  correctImageIds: z
    .array(z.string())
    .min(1, "Select at least 1 correct image")
    .max(8, "Maximum 8 correct images (9 = all selected = auto fail)"),
  incorrectImageIds: z.array(z.string()).nullable(),
  difficulty: z.number().min(0.1).max(1),
});

export type CreatePuzzleState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | null;

export async function createPuzzle(
  prevState: CreatePuzzleState,
  formData: FormData,
): Promise<CreatePuzzleState> {
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
    difficulty: parsed.data.difficulty,
  });

  redirect(`/dashboard/sites/${parsed.data.siteId}`);
}
