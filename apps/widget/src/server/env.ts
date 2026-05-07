import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3002),
  DATABASE_URL: z.string().url(),
  WIDGET_URL: z.string().url().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export const env = schema.parse(Bun.env);
