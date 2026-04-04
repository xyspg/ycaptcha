import { expect, test } from "@playwright/test";

test.describe("CAPTCHA Widget", () => {
	test("widget iframe loads and shows checkbox or error", async ({ page }) => {
		await page.goto("/widget/pk_test_nonexistent");
		await expect(page.locator("text=/not a robot|ERROR/")).toBeVisible();
	});
});
