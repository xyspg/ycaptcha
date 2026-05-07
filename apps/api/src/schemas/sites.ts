import { z } from "zod";
import { domainSchema } from "../lib/validators";

export const createSiteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  domain: domainSchema,
});

export const updateSiteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  domain: domainSchema,
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
