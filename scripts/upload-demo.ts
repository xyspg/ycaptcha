/**
 * One-time script to upload landing-demo images to R2 under demo/ prefix.
 * Usage: bun run scripts/upload-demo.ts <path-to-demo-dir>
 *
 * The directory should contain subdirectories, each being a demo set.
 * Outputs a JSON manifest to stdout that can be pasted into lib/demo-sets.ts
 */

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!;

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const MAX_DIMENSION = 300;
const WEBP_QUALITY = 80;

const DEMO_DIR = process.argv[2];
if (!DEMO_DIR) {
  console.error("Usage: bun run scripts/upload-demo.ts <path-to-demo-dir>");
  console.error(
    "The directory should contain subdirectories, each being a demo set.",
  );
  process.exit(1);
}

async function processAndUpload(
  filePath: string,
  setSlug: string,
  fileName: string,
) {
  const raw = await readFile(filePath);

  const processed = await sharp(raw)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "cover",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const contentHash = createHash("sha256").update(processed).digest("hex");
  const key = `demo/${setSlug}/${contentHash}.webp`;

  // Check if already exists (idempotent)
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    console.error(`  [skip] ${fileName} (already exists)`);
  } catch {
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: processed,
        ContentType: "image/webp",
      }),
    );
    console.error(`  [upload] ${fileName}`);
  }

  const nameWithoutExt = basename(fileName, extname(fileName));

  return {
    name: nameWithoutExt,
    url: `${R2_PUBLIC_URL}/${key}`,
    contentHash,
  };
}

async function main() {
  const { stat } = await import("node:fs/promises");
  const entries = await readdir(DEMO_DIR);
  const dirs = [];
  for (const entry of entries) {
    const full = join(DEMO_DIR, entry);
    if ((await stat(full)).isDirectory()) dirs.push(entry);
  }
  dirs.sort();

  const manifest: Record<
    string,
    {
      name: string;
      images: { name: string; url: string; contentHash: string }[];
    }
  > = {};

  for (const dir of dirs) {
    const dirPath = join(DEMO_DIR, dir);
    const files = (await readdir(dirPath))
      .filter((f) => !f.startsWith("."))
      .sort();

    console.error(`\n${dir} (${files.length} files)`);

    const images = [];
    for (const file of files) {
      const result = await processAndUpload(join(dirPath, file), dir, file);
      images.push(result);
    }

    manifest[dir] = { name: dir, images };
  }

  // Output JSON manifest
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
