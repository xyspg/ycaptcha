import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { neon } from "@neondatabase/serverless";

/**
 * Global teardown — delete the E2E test user and any R2 assets they uploaded.
 *
 * Order matters:
 * 1. Look up R2 audio + image URLs the test user owns (queryable while rows still exist).
 * 2. Delete puzzles first (puzzle.image_set_id is onDelete:"restrict").
 * 3. Delete the user — Neon cascades site/imageSet/image/audio/session/account/passkey.
 * 4. Delete the R2 keys we collected, skipping anything under /samples/ (shared assets).
 */
export default async function globalTeardown() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  const sql = neon(databaseUrl);
  const email = "e2e-test@ycaptcha.test";

  // Catches both the fixed e2e-test user and the timestamped delete-me-*
  // accounts created by account-deletion.spec.ts.
  const users = await sql`
    SELECT id FROM "user"
    WHERE email = ${email} OR email LIKE 'delete-me-%@ycaptcha.test'
  `;
  if (users.length === 0) return;
  const userIds = users.map((u) => u.id as string);

  const [audioRows, imageRows] = await Promise.all([
    sql`SELECT url FROM audio WHERE user_id = ANY(${userIds})`,
    sql`
      SELECT i.url FROM image i
      JOIN image_set s ON s.id = i.image_set_id
      WHERE s.user_id = ANY(${userIds})
    `,
  ]);
  const r2Urls = [
    ...audioRows.map((r) => r.url as string),
    ...imageRows.map((r) => r.url as string),
  ];

  await sql`
    DELETE FROM puzzle WHERE site_id IN (
      SELECT id FROM site WHERE user_id = ANY(${userIds})
    )
  `;
  await sql`DELETE FROM "user" WHERE id = ANY(${userIds})`;

  await deleteR2Urls(r2Urls);
}

async function deleteR2Urls(urls: string[]) {
  const publicUrl = process.env.R2_PUBLIC_URL;
  const bucket = process.env.R2_BUCKET;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!publicUrl || !bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    return;
  }

  const prefix = `${publicUrl}/`;
  const keys = urls
    .filter((u) => u.startsWith(prefix))
    .map((u) => u.slice(prefix.length))
    .filter((k) => !k.startsWith("samples/"));

  if (keys.length === 0) return;

  const s3 = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  await Promise.allSettled(
    keys.map((k) =>
      s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: k })),
    ),
  );
}
