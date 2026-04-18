import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const email = process.argv[2] ?? "demo@example.com";

const [row] = await sql`SELECT id FROM "user" WHERE email = ${email}`;
if (!row) {
  console.log(`No user with email ${email}`);
  process.exit(0);
}

const userId = row.id as string;
console.log(`Deleting user ${email} (${userId})`);

// puzzle.image_set_id is onDelete:"restrict" — must clear puzzles before
// the user → imageSet cascade fires.
const puzzles = await sql`
  DELETE FROM puzzle
  WHERE site_id IN (SELECT id FROM site WHERE user_id = ${userId})
  RETURNING id
`;
console.log(`Deleted ${puzzles.length} puzzles`);

const users = await sql`DELETE FROM "user" WHERE id = ${userId} RETURNING id`;
console.log(
  `Deleted ${users.length} user row (cascades to site, imageSet, image, audio, session, account, passkey)`,
);
