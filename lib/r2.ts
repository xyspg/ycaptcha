import { createHash } from "node:crypto";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { env } from "@/lib/env";

const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const MAX_DIMENSION = 300; // 2x retina for ~115px grid cells
const WEBP_QUALITY = 80;

export function hashBuffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function processImage(
  rawBuffer: Buffer,
): Promise<{ buffer: Buffer; contentHash: string }> {
  const processed = await sharp(rawBuffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "cover",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const contentHash = hashBuffer(processed);
  return { buffer: processed, contentHash };
}

export async function uploadBufferToR2(
  processed: Buffer,
): Promise<{ key: string; url: string }> {
  const key = `images/${nanoid()}.webp`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: processed,
      ContentType: "image/webp",
    }),
  );

  const url = `${env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
  return { key, url };
}

export async function uploadAudioToR2(
  buffer: Buffer,
  ext: string,
): Promise<{ key: string; url: string }> {
  const contentType =
    ext === "webm"
      ? "audio/webm"
      : ext === "mp3"
        ? "audio/mpeg"
        : ext === "ogg"
          ? "audio/ogg"
          : "audio/wav";
  const key = `audio/${nanoid()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  const url = `${env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;
  return { key, url };
}

export async function copyObjectInR2(
  sourceKey: string,
  destKey: string,
): Promise<{ key: string; url: string }> {
  await s3.send(
    new CopyObjectCommand({
      Bucket: env.R2_BUCKET,
      CopySource: `${env.R2_BUCKET}/${sourceKey}`,
      Key: destKey,
    }),
  );
  return { key: destKey, url: `${env.NEXT_PUBLIC_R2_PUBLIC_URL}/${destKey}` };
}

export async function deleteFromR2(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
    }),
  );
}

/**
 * Best-effort cleanup for R2 keys that were uploaded speculatively but then
 * orphaned (DB insert failed, quota exceeded, etc.). Swallows individual
 * failures and logs them — never throws, so it's safe in catch blocks.
 */
export async function cleanupR2Keys(
  keys: ReadonlyArray<string | null | undefined>,
): Promise<void> {
  const toDelete = keys.filter((k): k is string => !!k);
  if (toDelete.length === 0) return;
  const results = await Promise.allSettled(
    toDelete.map((k) => deleteFromR2(k)),
  );
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[r2] orphan cleanup failed", r.reason);
    }
  }
}

/**
 * Stream an asset from R2 through a proxy without exposing the underlying URL.
 * Sets `no-store` cache headers and `nosniff` to prevent client-side caching
 * and MIME confusion.
 */
export async function proxyR2Asset(
  sourceUrl: string,
  fallbackContentType: string,
): Promise<Response> {
  const upstream = await fetch(sourceUrl);
  if (!upstream.ok) {
    return new Response("Asset not found", { status: 502 });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? fallbackContentType,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function r2KeyFromUrl(url: string): string {
  const prefix = `${env.NEXT_PUBLIC_R2_PUBLIC_URL}/`;
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length);
  }
  return new URL(url).pathname.slice(1);
}
