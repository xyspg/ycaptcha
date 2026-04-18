import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { audio, image, imageSet } from "@/lib/db/app-schema";
import { formatBytes } from "@/lib/utils";

export const STORAGE_QUOTA_BYTES = 200 * 1024 * 1024;

export interface StorageUsage {
  imageBytes: number;
  audioBytes: number;
  totalBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  /** 0–100, integer-rounded for display. */
  percent: number;
}

/**
 * Sum a user's stored bytes across image rows (joined to image_set for
 * userId scoping) and audio rows. Postgres `sum()` returns bigint as a
 * string in node-postgres; we coerce to Number — safe for 200MB-scale
 * values.
 */
export async function getUserStorageUsage(
  userId: string,
): Promise<StorageUsage> {
  const [imageRow, audioRow] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${image.sizeBytes}), 0)`,
      })
      .from(image)
      .innerJoin(imageSet, eq(imageSet.id, image.imageSetId))
      .where(eq(imageSet.userId, userId)),
    db
      .select({
        total: sql<string>`coalesce(sum(${audio.sizeBytes}), 0)`,
      })
      .from(audio)
      .where(eq(audio.userId, userId)),
  ]);

  const imageBytes = Number(imageRow[0]?.total ?? 0);
  const audioBytes = Number(audioRow[0]?.total ?? 0);
  const totalBytes = imageBytes + audioBytes;
  const remainingBytes = Math.max(0, STORAGE_QUOTA_BYTES - totalBytes);
  const percent = Math.min(
    100,
    Math.round((totalBytes / STORAGE_QUOTA_BYTES) * 100),
  );

  return {
    imageBytes,
    audioBytes,
    totalBytes,
    quotaBytes: STORAGE_QUOTA_BYTES,
    remainingBytes,
    percent,
  };
}

/**
 * Pure check: returns null if `additionalBytes` fits within the quota,
 * or a human error string if not. Lets a caller fetch usage once and
 * check several files (e.g. image batch upload).
 */
export function checkQuota(
  usage: StorageUsage,
  additionalBytes: number,
): string | null {
  if (usage.totalBytes + additionalBytes <= STORAGE_QUOTA_BYTES) return null;
  return `Upload would exceed your ${formatBytes(STORAGE_QUOTA_BYTES)} storage quota (${formatBytes(usage.remainingBytes)} remaining)`;
}
