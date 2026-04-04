import { expect, test as setup } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("register and authenticate test user", async ({ page }) => {
	const email = "e2e-test@ycaptcha.test";
	const password = "TestPassword123!";
	const name = "E2E Test User";

	// Try signing up first; if the user already exists, fall back to login
	await page.goto("/signup");
	await page.getByLabel("Name").fill(name);
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password", { exact: true }).fill(password);
	await page.getByLabel("Confirm Password").fill(password);
	await page.getByRole("button", { name: "Sign Up" }).click();

	// Wait for either redirect to dashboard or error (user already exists)
	const result = await Promise.race([
		page.waitForURL("**/dashboard**", { timeout: 10_000 }).then(() => "ok"),
		page
			.locator(".text-destructive")
			.first()
			.waitFor({ timeout: 10_000 })
			.then(() => "error"),
	]);

	if (result === "error") {
		// User already exists, fall back to login
		await page.goto("/login");
		await page.getByLabel("Email").fill(email);
		await page.getByLabel("Password", { exact: true }).fill(password);
		await page.getByRole("button", { name: "Sign In", exact: true }).click();
		await page.waitForURL("**/dashboard**", { timeout: 10_000 });
	}

	await expect(page).toHaveURL(/dashboard/);

	// Save authenticated state
	await page.context().storageState({ path: authFile });
});
