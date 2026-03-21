/**
 * One-time script to upload sample images to R2 under samples/ prefix.
 * Usage: bun run scripts/upload-samples.ts <path-to-samples-dir>
 *
 * The directory should contain subdirectories, each being a sample set.
 * Outputs a JSON manifest to stdout that can be pasted into lib/samples.ts
 */
import { readdir, readFile } from "fs/promises";
import { join, extname, basename } from "path";
import { createHash } from "crypto";
import sharp from "sharp";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

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

const SAMPLE_DIR = process.argv[2];
if (!SAMPLE_DIR) {
  console.error("Usage: bun run scripts/upload-samples.ts <path-to-samples-dir>");
  console.error("The directory should contain subdirectories, each being a sample set.");
  process.exit(1);
}

async function processAndUpload(filePath: string, setSlug: string, fileName: string) {
  const raw = await readFile(filePath);

  const processed = await sharp(raw)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "cover",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const contentHash = createHash("sha256").update(processed).digest("hex");
  const key = `samples/${setSlug}/${contentHash}.webp`;

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
  const { stat } = await import("fs/promises");
  const entries = await readdir(SAMPLE_DIR);
  const dirs = [];
  for (const entry of entries) {
    const full = join(SAMPLE_DIR, entry);
    if ((await stat(full)).isDirectory()) dirs.push(entry);
  }
  dirs.sort();

  const manifest: Record<string, { name: string; images: { name: string; url: string; contentHash: string }[] }> = {};

  for (const dir of dirs) {
    const dirPath = join(SAMPLE_DIR, dir);
    const files = (await readdir(dirPath)).filter(
      (f) => !f.startsWith("."),
    ).sort();

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
