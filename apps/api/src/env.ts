import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.url(),
  REDIS_URL: z.string().min(1),

  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  WEB_APP_URL: z.url(),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_TRUSTED_ORIGINS: z.string().optional(),
  PASSKEY_RP_ID: z.string().optional(),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_PUBLIC_URL: z.url(),

  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),

  SITE_URL: z.url(),
  SENTRY_DSN: z.url().optional(),

  DISABLE_RATE_LIMIT: z.literal("true").optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "[env] invalid environment variables",
    z.flattenError(parsed.error).fieldErrors,
  );
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
