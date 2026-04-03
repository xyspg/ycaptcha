import { expect, test } from "@playwright/test";

test.describe("CAPTCHA Widget", () => {
	test("captcha.js auto-renders iframe from .y-captcha container", async ({
		page,
	}) => {
		await page.goto("/test.html");
		const iframe = page.locator("iframe[title='yCAPTCHA challenge']");
		await expect(iframe).toBeVisible();
	});

	test("widget iframe loads and shows checkbox or error", async ({ page }) => {
		await page.goto("/widget/pk_test_nonexistent");
		await expect(page.locator("text=/not a robot|ERROR/")).toBeVisible();
	});
});
