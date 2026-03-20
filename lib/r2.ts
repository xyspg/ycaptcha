import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { env } from "@/lib/env";

const s3 = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

/** Max dimension for resized images (2x retina for ~115px grid cells) */
const MAX_DIMENSION = 300;
const WEBP_QUALITY = 80;

/**
 * Upload an image to R2 after resizing to 300x300 max and converting to WebP.
 * Returns the public URL. Key format: images/<nanoid>.webp
 */
export async function uploadToR2(
  file: File,
): Promise<{ key: string; url: string }> {
  const key = `images/${nanoid()}.webp`;

  const rawBuffer = Buffer.from(await file.arrayBuffer());

  const processed = await sharp(rawBuffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "cover",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

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

/**
 * Delete a file from R2 by its key (e.g. "images/abc123.webp").
 */
export async function deleteFromR2(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
    }),
  );
}

/**
 * Extract the R2 key from a public URL.
 * e.g. "https://s3.ycaptcha.xyspg.moe/images/abc.webp" → "images/abc.webp"
 */
export function r2KeyFromUrl(url: string): string {
  const prefix = env.R2_PUBLIC_URL + "/";
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length);
  }
  return new URL(url).pathname.slice(1);
}
