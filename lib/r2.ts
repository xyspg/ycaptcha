import { createHash } from "node:crypto";
import {
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

  const contentHash = createHash("sha256").update(processed).digest("hex");
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

  const url = `${env.R2_PUBLIC_URL}/${key}`;
  return { key, url };
}

export async function deleteFromR2(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
    }),
  );
}

export function r2KeyFromUrl(url: string): string {
  const prefix = `${env.R2_PUBLIC_URL}/`;
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length);
  }
  return new URL(url).pathname.slice(1);
}
