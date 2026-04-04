import { neon } from "@neondatabase/serverless";

/**
 * Global teardown: delete the E2E test user and all cascaded data.
 * Runs after ALL tests complete (pass or fail).
 *
 * Must delete puzzles first because puzzle.imageSetId has onDelete:"restrict",
 * so cascading user → imageSet deletion would be blocked if puzzles still exist.
 */
export default async function globalTeardown() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) return;

	const sql = neon(databaseUrl);
	const email = "e2e-test@ycaptcha.test";

	// Delete puzzles first (they reference both site and imageSet)
	await sql`
		DELETE FROM puzzle WHERE site_id IN (
			SELECT id FROM site WHERE user_id IN (
				SELECT id FROM "user" WHERE email = ${email}
			)
		)
	`;
	// Now user cascade can safely delete sites and imageSets
	await sql`DELETE FROM "user" WHERE email = ${email}`;
}
