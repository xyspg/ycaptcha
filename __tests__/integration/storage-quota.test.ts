import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { audio } from "@/lib/db/app-schema";
import {
  checkQuota,
  getUserStorageUsage,
  STORAGE_QUOTA_BYTES,
} from "@/lib/storage-quota";
import { cleanup, seed, TEST_AUDIO_ID, TEST_USER_ID } from "./seed";

beforeAll(async () => {
  await seed();
});

afterAll(async () => {
  await cleanup();
}, 30_000);

describe("getUserStorageUsage", () => {
  it("counts seeded audio sizeBytes", async () => {
    const usage = await getUserStorageUsage(TEST_USER_ID);
    expect(usage.audioBytes).toBeGreaterThan(0);
    expect(usage.totalBytes).toBe(usage.imageBytes + usage.audioBytes);
    expect(usage.quotaBytes).toBe(STORAGE_QUOTA_BYTES);
  });

  it("computes percent and remaining correctly", async () => {
    const usage = await getUserStorageUsage(TEST_USER_ID);
    expect(usage.percent).toBe(
      Math.min(100, Math.round((usage.totalBytes / STORAGE_QUOTA_BYTES) * 100)),
    );
    expect(usage.remainingBytes).toBe(
      Math.max(0, STORAGE_QUOTA_BYTES - usage.totalBytes),
    );
  });

  it("returns zeros for a user with no rows", async () => {
    const usage = await getUserStorageUsage("nonexistent-user-xyz");
    expect(usage.imageBytes).toBe(0);
    expect(usage.audioBytes).toBe(0);
    expect(usage.totalBytes).toBe(0);
    expect(usage.percent).toBe(0);
    expect(usage.remainingBytes).toBe(STORAGE_QUOTA_BYTES);
  });

  it("reflects sizeBytes changes within the same row", async () => {
    const before = await getUserStorageUsage(TEST_USER_ID);

    // Bump the seeded audio's sizeBytes by 1 MB temporarily.
    const bumpBy = 1024 * 1024;
    await db
      .update(audio)
      .set({ sizeBytes: 44_100 + bumpBy })
      .where(eq(audio.id, TEST_AUDIO_ID));

    const after = await getUserStorageUsage(TEST_USER_ID);
    expect(after.audioBytes - before.audioBytes).toBe(bumpBy);

    // Restore so other test files see the original size.
    await db
      .update(audio)
      .set({ sizeBytes: 44_100 })
      .where(eq(audio.id, TEST_AUDIO_ID));
  });
});

describe("checkQuota", () => {
  const baseUsage = {
    imageBytes: 0,
    audioBytes: 0,
    totalBytes: 0,
    quotaBytes: STORAGE_QUOTA_BYTES,
    remainingBytes: STORAGE_QUOTA_BYTES,
    percent: 0,
  };

  it("returns null when within quota", () => {
    expect(checkQuota(baseUsage, 1)).toBeNull();
    expect(checkQuota(baseUsage, STORAGE_QUOTA_BYTES)).toBeNull();
  });

  it("returns an error string when adding bytes would exceed the quota", () => {
    const err = checkQuota(baseUsage, STORAGE_QUOTA_BYTES + 1);
    expect(err).toMatch(/exceed/i);
    expect(err).toMatch(/200\.0 MB/);
  });

  it("respects already-consumed bytes", () => {
    const half = {
      ...baseUsage,
      totalBytes: STORAGE_QUOTA_BYTES / 2,
      remainingBytes: STORAGE_QUOTA_BYTES / 2,
    };
    // Exactly fits: no error.
    expect(checkQuota(half, STORAGE_QUOTA_BYTES / 2)).toBeNull();
    // One byte over: rejected.
    expect(checkQuota(half, STORAGE_QUOTA_BYTES / 2 + 1)).toMatch(/exceed/i);
  });

  it("includes remaining bytes in the human message", () => {
    const usage = {
      ...baseUsage,
      totalBytes: 1024 * 1024,
      remainingBytes: STORAGE_QUOTA_BYTES - 1024 * 1024,
    };
    const err = checkQuota(usage, STORAGE_QUOTA_BYTES);
    expect(err).toContain("remaining");
  });
});
