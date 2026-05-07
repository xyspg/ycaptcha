import { z } from "zod";

export const createImageSetSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export const updateImageSetSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export type CreateImageSetInput = z.infer<typeof createImageSetSchema>;
export type UpdateImageSetInput = z.infer<typeof updateImageSetSchema>;
