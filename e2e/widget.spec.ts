import { expect, test } from "@playwright/test";

test.describe("CAPTCHA Widget", () => {
	test("captcha.js auto-renders iframe from .y-captcha container", async ({
		page,
	}) => {
		await page.goto("/test.html");
		// captcha.js finds .y-captcha elements and injects an iframe
		const iframe = page.locator("iframe[title='yCAPTCHA challenge']");
		await expect(iframe).toBeVisible();
	});

	test("widget iframe loads and shows checkbox or error", async ({ page }) => {
		// Go directly to the widget page (bypass captcha.js)
		// Using a fake siteKey — should show error state since it won't exist in DB
		await page.goto("/widget/pk_test_nonexistent");
		// The page should render — either the checkbox (idle) or error state
		// The checkbox text "I'm not a robot" or error text should be visible
		await expect(page.locator("text=/not a robot|ERROR/")).toBeVisible();
	});
});
