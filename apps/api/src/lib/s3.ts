import { createHash } from "node:crypto";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { env } from "../env";

const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const MAX_DIMENSION = 300;
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

export async function uploadBufferToS3(
  processed: Buffer,
): Promise<{ key: string; url: string }> {
  const key = `images/${nanoid()}.webp`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: processed,
      ContentType: "image/webp",
    }),
  );

  const url = `${env.S3_PUBLIC_URL}/${key}`;
  return { key, url };
}

export async function uploadAudioToS3(
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
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  const url = `${env.S3_PUBLIC_URL}/${key}`;
  return { key, url };
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
  );
}

export async function cleanupS3Keys(
  keys: ReadonlyArray<string | null | undefined>,
): Promise<void> {
  const toDelete = keys.filter((k): k is string => !!k);
  if (toDelete.length === 0) return;
  const results = await Promise.allSettled(
    toDelete.map((k) => deleteFromS3(k)),
  );
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[s3] orphan cleanup failed", r.reason);
    }
  }
}

/**
 * Stream an asset from S3 through a proxy without exposing the underlying URL.
 * Sets `no-store` cache headers and `nosniff` to prevent client-side caching
 * and MIME confusion.
 */
export async function proxyS3Asset(
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

export function s3KeyFromUrl(url: string): string {
  const prefix = `${env.S3_PUBLIC_URL}/`;
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length);
  }
  return new URL(url).pathname.slice(1);
}
