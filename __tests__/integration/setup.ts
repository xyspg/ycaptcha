import { eq } from "drizzle-orm";
import { vi } from "vitest";
import { db } from "@/lib/db";
import { verificationEvent } from "@/lib/db/app-schema";
import { TEST_USER_ID } from "./seed";

// `server-only` is a Next.js build-time marker; not installed at runtime.
vi.mock("server-only", () => ({}));

// `after()` needs a Next.js request context. In tests we queue the callbacks
// and expose `flushAfter()` so individual tests can await post-response side
// effects (analytics writes) before asserting DB state.
const { afterQueue } = vi.hoisted(() => ({
  afterQueue: [] as Promise<unknown>[],
}));

vi.mock("next/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/server")>();
  return {
    ...mod,
    after: (fn: () => unknown | Promise<unknown>) => {
      afterQueue.push(Promise.resolve().then(() => fn()));
    },
  };
});

export async function flushAfter(): Promise<void> {
  if (afterQueue.length === 0) return;
  await Promise.allSettled(afterQueue.splice(0));
}

/** Wait for pending after() callbacks, then wipe the test user's events. */
export async function resetTestUserEvents(): Promise<void> {
  await flushAfter();
  await db
    .delete(verificationEvent)
    .where(eq(verificationEvent.userId, TEST_USER_ID));
}

// Mock @/lib/env — provide real DB/Redis values from process.env, fake for the rest
vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    BETTER_AUTH_SECRET: "test-secret",
    BETTER_AUTH_URL: "http://localhost:3000",
    GITHUB_CLIENT_ID: "test-gh-id",
    GITHUB_CLIENT_SECRET: "test-gh-secret",
    R2_ACCESS_KEY_ID: "test-r2-key",
    R2_SECRET_ACCESS_KEY: "test-r2-secret",
    R2_BUCKET: "ycaptcha",
    R2_ENDPOINT: "https://fake.r2.cloudflarestorage.com",
    NEXT_PUBLIC_R2_PUBLIC_URL: "https://r2.ycaptcha.xyspg.moe",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
}));

// Mock rate limiting — always allow (tested separately via direct Ratelimit instance)
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: {
    challenge: {},
    verify: {},
    siteverify: {},
    image: {},
    auth: {},
  },
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock sharp — not needed in API route tests
vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake")),
  })),
}));

// Mock S3 client — not needed in API route tests
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = vi.fn();
  },
  PutObjectCommand: class {},
  DeleteObjectCommand: class {},
}));
