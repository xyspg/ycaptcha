import { z } from "zod"

export const domainSchema = z
  .string()
  .min(1, "Domain is required")
  .max(253, "Domain is too long")
  .transform((v) => v.replace(/^https?:\/\//, "").replace(/:\d+$/, "").replace(/\/+$/, ""))
  .refine((v) => /^(localhost|([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})$/.test(v), {
    message: "Invalid domain (e.g. example.com or localhost)",
  })
