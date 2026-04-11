import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const ORIGIN = "http://localhost:3000";

/** Create a site with domain=localhost. Returns siteKey and detail page URL. */
export async function createSiteWithKeys(
	page: Page,
	name: string,
): Promise<{ siteKey: string; secretKey: string; detailUrl: string }> {
	await page.goto("/dashboard/sites");
	await page.getByRole("button", { name: "Add Site" }).first().click();

	const dialog = page.locator("[data-slot='dialog-content']");
	await expect(dialog).toBeVisible();
	await dialog.getByLabel("Name").fill(name);
	await dialog.getByLabel("Domain").fill("localhost");
	await dialog.getByRole("button", { name: "Create Site" }).click();
	await expect(dialog).not.toBeVisible({ timeout: 10_000 });

	await page.getByRole("link", { name: name }).click();
	await page.waitForURL("**/dashboard/sites/**");
	const detailUrl = page.url();

	const spans = page.locator(".font-mono span.truncate");
	let siteKey = "";
	for (let i = 0; i < (await spans.count()); i++) {
		const text = await spans.nth(i).textContent();
		if (text?.startsWith("pk_")) {
			siteKey = text;
			break;
		}
	}
	expect(siteKey).toMatch(/^pk_/);

	// Reveal secret key
	const eyeButton = page
		.locator("button")
		.filter({ has: page.locator("svg.lucide-eye") });
	if ((await eyeButton.count()) > 0) {
		await eyeButton.first().click();
		await expect(spans.filter({ hasText: /^sk_/ })).toBeVisible();
	}

	let secretKey = "";
	for (let i = 0; i < (await spans.count()); i++) {
		const text = await spans.nth(i).textContent();
		if (text?.startsWith("sk_")) {
			secretKey = text;
			break;
		}
	}
	expect(secretKey).toMatch(/^sk_/);

	return { siteKey, secretKey, detailUrl };
}

/** Delete a site via the danger zone confirm dialog. */
export async function deleteSite(page: Page, url: string, name: string) {
	await page.goto(url);
	await page
		.locator(".border-destructive\\/50")
		.getByRole("button", { name: "Delete Site" })
		.click();
	await page.getByPlaceholder(name).fill(name);
	await page.getByRole("button", { name: "Delete" }).click();
	// Action revalidates but doesn't redirect — navigate manually and verify
	await page.waitForTimeout(2000);
	await page.goto("/dashboard/sites");
	await expect(page.getByText(name)).not.toBeVisible();
}

/** Import the first available sample set. Returns the image set detail URL. */
export async function importSampleSet(page: Page): Promise<string> {
	await page.goto("/dashboard/image-sets");

	const setLinks = page.locator("a[href^='/dashboard/image-sets/']");
	const before = new Set(
		await setLinks.evaluateAll((els) =>
			els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
		),
	);

	await page
		.getByRole("button", { name: "Import", exact: true })
		.first()
		.click();

	await expect
		.poll(
			async () =>
				(
					await setLinks.evaluateAll((els) =>
						els.map(
							(el) => (el as HTMLAnchorElement).getAttribute("href") ?? "",
						),
					)
				).some((href) => !before.has(href)),
			{ timeout: 15_000 },
		)
		.toBe(true);

	const after = await setLinks.evaluateAll((els) =>
		els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
	);
	const newHref = after.find((href) => !before.has(href));
	if (!newHref) throw new Error("No new image set detected after import");

	await page.goto(newHref);
	return page.url();
}

/** Retry challenge+verify until we get a passing token. */
export async function getVerificationToken(
	request: APIRequestContext,
	siteKey: string,
	maxAttempts = 30,
): Promise<string> {
	for (let i = 0; i < maxAttempts; i++) {
		const c = await (
			await request.post("/api/v0/captcha/challenge", {
				data: { siteKey, origin: ORIGIN },
			})
		).json();
		const v = await (
			await request.post("/api/v0/captcha/verify", {
				data: { sessionToken: c.sessionToken, selectedIndices: [0] },
			})
		).json();
		if (v.success) return v.token;
	}
	throw new Error(
		`Failed to get verification token in ${maxAttempts} attempts`,
	);
}

/** Select the first available image set in the puzzle creation form. */
export async function selectFirstImageSet(page: Page) {
	const imageSetSelect = page.locator("select").nth(1);
	const firstValue = await imageSetSelect
		.locator("option")
		.nth(1)
		.getAttribute("value");
	await imageSetSelect.selectOption(firstValue!);
}

/** Ensure the site select is populated (URL param may not hydrate). */
export async function ensureSiteSelected(page: Page) {
	const siteSelect = page.locator("select").nth(0);
	const siteSelected = await siteSelect.inputValue();
	if (!siteSelected) {
		const siteOption = await siteSelect
			.locator("option")
			.nth(1)
			.getAttribute("value");
		await siteSelect.selectOption(siteOption!);
	}
}
