import { z } from "zod";
import { CAPTCHA_GRID_SIZE, CAPTCHA_MODES } from "../lib/types";

const captchaModeEnum = z.enum(CAPTCHA_MODES);

const basePuzzleFields = {
  captchaMode: captchaModeEnum,
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
  audioId: z.string().nullable(),
  audioAnswer: z.string().max(200).nullable(),
};

type PuzzleData = {
  captchaMode: (typeof CAPTCHA_MODES)[number];
  imageSetId: string;
  prompt: string;
  correctImageIds: string[];
  incorrectImageIds: string[] | null;
  correctCount: number;
  correctCountMax: number | null;
  difficulty: number;
  audioId: string | null;
  audioAnswer: string | null;
};

const refine = <T extends PuzzleData>(d: T) => {
  if (d.captchaMode !== "audio") {
    if (d.imageSetId.length === 0)
      return { message: "Please select an image set", path: ["imageSetId"] };
    if (d.prompt.length === 0)
      return { message: "Prompt is required", path: ["prompt"] };
    if (d.correctImageIds.length === 0)
      return {
        message: "Select at least 1 correct image",
        path: ["correctImageIds"],
      };
    if (d.correctCount > d.correctImageIds.length)
      return {
        message:
          "Correct count per challenge cannot exceed total correct images",
        path: ["correctCount"],
      };
    if (d.correctCountMax && d.correctCountMax < d.correctCount)
      return { message: "Max must be >= min", path: ["correctCountMax"] };
    if (d.correctCountMax && d.correctCountMax > d.correctImageIds.length)
      return {
        message: "Max cannot exceed total correct images",
        path: ["correctCountMax"],
      };
  }
  if (d.captchaMode !== "image") {
    if (!d.audioId)
      return { message: "Please select an audio clip", path: ["audioId"] };
    if (!d.audioAnswer || d.audioAnswer.trim().length === 0)
      return { message: "Answer is required", path: ["audioAnswer"] };
  }
  return null;
};

export const createPuzzleSchema = z
  .object({
    ...basePuzzleFields,
    siteId: z.string().min(1, "Please select a site"),
  })
  .superRefine((d, ctx) => {
    const err = refine(d);
    if (err) ctx.addIssue({ code: "custom", ...err });
  });

export const updatePuzzleSchema = z
  .object(basePuzzleFields)
  .superRefine((d, ctx) => {
    const err = refine(d);
    if (err) ctx.addIssue({ code: "custom", ...err });
  });

export const togglePuzzleSchema = z.object({ enabled: z.boolean() });

export type CreatePuzzleInput = z.infer<typeof createPuzzleSchema>;
export type UpdatePuzzleInput = z.infer<typeof updatePuzzleSchema>;
