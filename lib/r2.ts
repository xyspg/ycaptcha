import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
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

/**
 * Upload a file to R2. Returns the public URL.
 * Key format: images/<nanoid>.<ext>
 */
export async function uploadToR2(
  file: File,
): Promise<{ key: string; url: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const key = `images/${nanoid()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }),
  );

  const url = `${env.R2_PUBLIC_URL}/${key}`;
  return { key, url };
}

/**
 * Delete a file from R2 by its key (e.g. "images/abc123.jpg").
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
 * e.g. "https://s3.ycaptcha.xyspg.moe/images/abc.jpg" → "images/abc.jpg"
 */
export function r2KeyFromUrl(url: string): string {
  const prefix = env.R2_PUBLIC_URL + "/";
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length);
  }
  // Fallback: extract path after last domain
  return new URL(url).pathname.slice(1);
}
