import { expect, test } from "@playwright/test";
import { deleteSite, importSampleSet, selectFirstImageSet } from "./helpers";

test.describe
	.serial("Dashboard CRUD flow", () => {
		const siteName = `E2E Test Site ${Date.now()}`;
		const siteDomain = "e2e-test.example.com";
		const puzzlePrompt = "frontend toolchains";

		let siteDetailUrl: string;
		let imageSetDetailUrl: string;

		test("create a site", async ({ page }) => {
			await page.goto("/dashboard/sites");
			await page.getByRole("button", { name: "Add Site" }).first().click();

			const sheet = page.locator("[data-slot='sheet-content']");
			await expect(sheet).toBeVisible();
			await sheet.getByLabel("Name").fill(siteName);
			await sheet.getByLabel("Domain").fill(siteDomain);
			await sheet.getByRole("button", { name: "Create Site" }).click();
			await expect(sheet).not.toBeVisible({ timeout: 10_000 });
			await expect(page.getByText(siteName)).toBeVisible();
		});

		test("site detail shows API keys", async ({ page }) => {
			await page.goto("/dashboard/sites");
			await page.getByRole("link", { name: siteName }).click();
			await page.waitForURL("**/dashboard/sites/**");
			siteDetailUrl = page.url();

			await expect(page.getByText("API Keys")).toBeVisible();
			await expect(page.getByText("Site Key (public)")).toBeVisible();
			await expect(page.getByText("Secret Key (private)")).toBeVisible();

			const pkSpan = page.locator(".font-mono span.truncate").first();
			expect(await pkSpan.textContent()).toMatch(/^pk_/);
		});

		test("import a sample image set", async ({ page }) => {
			imageSetDetailUrl = await importSampleSet(page);
			await expect(page.getByText(/^Images \(\d+\)$/)).toBeVisible();
		});

		test("create a puzzle", async ({ page }) => {
			await page.goto(siteDetailUrl);
			await page.getByRole("link", { name: "Create Puzzle" }).click();
			await page.waitForURL("**/dashboard/puzzles/new**");

			await selectFirstImageSet(page);

			await page
				.getByPlaceholder("e.g. trains, buses, crosswalks")
				.fill(puzzlePrompt);

			const imageButtons = page.locator(
				'button[type="button"]:has(img[draggable="false"])',
			);
			await expect(imageButtons.first()).toBeVisible();
			expect(await imageButtons.count()).toBeGreaterThanOrEqual(3);
			for (let i = 0; i < 3; i++) {
				await imageButtons.nth(i).click();
			}

			await page.getByRole("button", { name: "Create Puzzle" }).click();
			await page.waitForURL("**/dashboard/sites/**", { timeout: 10_000 });
		});

		test("puzzle appears on site detail", async ({ page }) => {
			await page.goto(siteDetailUrl);
			await expect(page.getByText(puzzlePrompt)).toBeVisible();
		});

		test("delete puzzle via context menu", async ({ page }) => {
			await page.goto(siteDetailUrl);
			await page.getByText(puzzlePrompt).click({ button: "right" });
			await page.getByRole("menuitem", { name: "Delete Puzzle" }).click();
			await page.getByRole("button", { name: "Delete" }).click();
			await expect(page.getByText(puzzlePrompt)).not.toBeVisible({
				timeout: 10_000,
			});
		});

		test("delete the image set", async ({ page }) => {
			await page.goto(imageSetDetailUrl);
			await page.getByRole("button", { name: "Delete Image Set" }).click();
			await page.getByRole("button", { name: "Delete" }).click();
			await page.waitForURL("**/dashboard/image-sets", { timeout: 10_000 });
		});

		test("delete the site with typed confirmation", async ({ page }) => {
			await deleteSite(page, siteDetailUrl, siteName);
		});
	});
