import { z } from "zod";

export const updateAudioSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export type UpdateAudioInput = z.infer<typeof updateAudioSchema>;
