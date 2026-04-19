import { expect, test } from "@playwright/test";
import {
  createSiteWithKeys,
  deleteSite,
  ensureSiteSelected,
  fillAudioFields,
  importSampleSet,
  selectCaptchaMode,
  selectFirstImageSet,
  uploadAudioClip,
} from "./helpers";

test.describe
  .serial("Audio CAPTCHA — dashboard puzzle flows", () => {
    const siteName = `Audio E2E Site ${Date.now()}`;
    const audioName = `audio-${Date.now()}`;
    const audioAnswer = "verify";

    let siteDetailUrl: string;

    // ── Setup ─────────────────────────────────────────────────────────────

    test("upload an audio clip via the dashboard dialog", async ({ page }) => {
      // uploadAudioClip already asserts the new card is visible.
      await uploadAudioClip(page, audioName);
    });

    test("create a site for audio puzzles", async ({ page }) => {
      const keys = await createSiteWithKeys(page, siteName);
      siteDetailUrl = keys.detailUrl;
    });

    test("import a sample image set for the combined puzzle", async ({
      page,
    }) => {
      await importSampleSet(page);
    });

    // ── Mode-aware UI ─────────────────────────────────────────────────────

    test("switching to Audio only hides image fields and reveals audio fields", async ({
      page,
    }) => {
      await page.goto("/dashboard/puzzles/new");
      await ensureSiteSelected(page);

      await expect(
        page
          .locator("[data-slot='card']")
          .filter({ hasText: "Image Set" })
          .first(),
      ).toBeVisible();

      await selectCaptchaMode(page, "Audio only");

      await expect(
        page
          .locator("[data-slot='card']")
          .filter({ hasText: "Image Set" })
          .first(),
      ).toBeHidden();
      await expect(
        page
          .locator("[data-slot='card']")
          .filter({ hasText: "Audio CAPTCHA" })
          .first(),
      ).toBeVisible();
    });

    test("Combined mode shows BOTH image and audio fields", async ({
      page,
    }) => {
      await page.goto("/dashboard/puzzles/new");
      await ensureSiteSelected(page);
      await selectCaptchaMode(page, "Combined (image + audio toggle)");

      await expect(
        page
          .locator("[data-slot='card']")
          .filter({ hasText: "Image Set" })
          .first(),
      ).toBeVisible();
      await expect(
        page
          .locator("[data-slot='card']")
          .filter({ hasText: "Audio CAPTCHA" })
          .first(),
      ).toBeVisible();
    });

    // ── Save-button gating ────────────────────────────────────────────────

    test("Audio-only save is gated on selecting clip + typing answer", async ({
      page,
    }) => {
      await page.goto("/dashboard/puzzles/new");
      await ensureSiteSelected(page);
      await selectCaptchaMode(page, "Audio only");

      const submit = page.getByRole("button", { name: "Create Puzzle" });
      await expect(submit).toBeDisabled();

      await fillAudioFields(page, "");
      await page.getByLabel("Correct Answer").fill("");
      await expect(submit).toBeDisabled();

      await page.getByLabel("Correct Answer").fill(audioAnswer);
      await expect(submit).toBeEnabled();
    });

    // ── Create audio-only puzzle ──────────────────────────────────────────

    test("create an audio-only puzzle", async ({ page }) => {
      await page.goto("/dashboard/puzzles/new");
      await ensureSiteSelected(page);
      await selectCaptchaMode(page, "Audio only");
      await fillAudioFields(page, audioAnswer);

      await page.getByRole("button", { name: "Create Puzzle" }).click();
      await page.waitForURL("**/dashboard/sites/**", { timeout: 10_000 });
    });

    // Puzzle detail links — excludes the "Create Puzzle" link (/new).
    const puzzleRowLinks = 'a[href^="/dashboard/puzzles/"]:not([href*="/new"])';

    test("audio-only puzzle appears on site detail", async ({ page }) => {
      // Audio-only mode allows an empty prompt (commit c27aa29 removed the
      // `|| "Verify"` fallback), so assert on the puzzle link itself
      // rather than the card's prompt text.
      await page.goto(siteDetailUrl);
      await expect(page.locator(puzzleRowLinks)).toHaveCount(1);
    });

    // ── Edit puzzle: switch from audio-only to combined ───────────────────

    test("editing audio-only puzzle: switch to Combined needs an image set", async ({
      page,
    }) => {
      await page.goto(siteDetailUrl);
      await page.locator(puzzleRowLinks).first().click();
      await page.waitForURL("**/dashboard/puzzles/**");

      await selectCaptchaMode(page, "Combined (image + audio toggle)");

      // Image set is required — Save Changes stays disabled until we pick one.
      const save = page.getByRole("button", { name: /Save Changes|Saving/ });
      await expect(save).toBeDisabled();

      await selectFirstImageSet(page);

      const imageButtons = page.locator(
        'button[type="button"]:has(img[draggable="false"])',
      );
      await expect(imageButtons.first()).toBeVisible();
      await imageButtons.first().click();
      await page
        .getByPlaceholder("e.g. trains, buses, crosswalks")
        .fill("logo");

      await expect(save).toBeEnabled();
      await save.click();
      await expect(page.getByText("Puzzle updated")).toBeVisible({
        timeout: 10_000,
      });
    });

    // ── Cleanup ────────────────────────────────────────────────────────────

    test("delete puzzle from site detail", async ({ page }) => {
      await page.goto(siteDetailUrl);
      await page.getByText("logo").first().click({ button: "right" });
      await page.getByRole("menuitem", { name: "Delete Puzzle" }).click();
      await page.getByRole("button", { name: "Delete" }).click();
      await expect(page.getByText("logo")).toBeHidden({ timeout: 10_000 });
    });

    test("delete the audio clip", async ({ page }) => {
      await page.goto("/dashboard/audio");
      await page.getByRole("link", { name: audioName }).click();
      await page.waitForURL("**/dashboard/audio/**");
      await page.getByRole("button", { name: "Delete Audio" }).click();
      await page.getByRole("button", { name: "Delete" }).click();
      await page.waitForURL("**/dashboard/audio", { timeout: 10_000 });
      await expect(
        page.getByRole("link", { name: audioName }),
      ).not.toBeVisible();
    });

    test("delete the test site", async ({ page }) => {
      await deleteSite(page, siteDetailUrl, siteName);
    });
  });
