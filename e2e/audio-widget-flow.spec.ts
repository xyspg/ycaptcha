import { expect, type Page, test } from "@playwright/test";
import {
  createSiteWithKeys,
  deleteSite,
  ensureSiteSelected,
  fillAudioFields,
  importSampleSet,
  loadWidgetWithReferer,
  ORIGIN,
  selectCaptchaMode,
  selectFirstImageSet,
  uploadAudioClip,
} from "./helpers";

test.describe
  .serial("Audio CAPTCHA — widget runtime behavior", () => {
    const ts = Date.now();
    const audioName = `widget-audio-${ts}`;
    const audioAnswer = "yellowsubmarine";

    const audioSiteName = `Audio Widget Site ${ts}`;
    const combinedSiteName = `Combined Widget Site ${ts}`;

    let audioSiteKey = "";
    let audioSiteUrl = "";

    let combinedSiteKey = "";
    let combinedSiteUrl = "";

    // ── Setup: upload audio + create both puzzles ─────────────────────────

    test("setup: upload audio clip", async ({ page }) => {
      await uploadAudioClip(page, audioName);
    });

    test("setup: import a sample image set (shared across puzzles)", async ({
      page,
    }) => {
      await importSampleSet(page);
    });

    test("setup: create site + audio-only puzzle", async ({ page }) => {
      const keys = await createSiteWithKeys(page, audioSiteName);
      audioSiteKey = keys.siteKey;
      audioSiteUrl = keys.detailUrl;

      await page.goto(audioSiteUrl);
      await page.getByRole("link", { name: "Create Puzzle" }).click();
      await page.waitForURL("**/dashboard/puzzles/new**");

      await ensureSiteSelected(page);
      await selectCaptchaMode(page, "Audio only");
      await fillAudioFields(page, audioAnswer);

      await page.getByRole("button", { name: "Create Puzzle" }).click();
      await page.waitForURL("**/dashboard/sites/**", { timeout: 10_000 });
    });

    test("setup: create site + combined puzzle (image + audio toggle)", async ({
      page,
    }) => {
      const keys = await createSiteWithKeys(page, combinedSiteName);
      combinedSiteKey = keys.siteKey;
      combinedSiteUrl = keys.detailUrl;

      await page.goto(combinedSiteUrl);
      await page.getByRole("link", { name: "Create Puzzle" }).click();
      await page.waitForURL("**/dashboard/puzzles/new**");

      await ensureSiteSelected(page);
      await selectCaptchaMode(page, "Combined (image + audio toggle)");
      await selectFirstImageSet(page);

      await page
        .getByPlaceholder("e.g. trains, buses, crosswalks")
        .fill("combined-test");

      const imageButtons = page.locator(
        'button[type="button"]:has(img[draggable="false"])',
      );
      await expect(imageButtons.first()).toBeVisible();
      for (let i = 0; i < 3; i++) await imageButtons.nth(i).click();

      await fillAudioFields(page, audioAnswer);

      await page.getByRole("button", { name: "Create Puzzle" }).click();
      await page.waitForURL("**/dashboard/sites/**", { timeout: 10_000 });
    });

    // ── Challenge response shape (sanity, independent of UI) ──────────────

    test("audio-only siteKey returns audioEnabled and no images", async ({
      request,
    }) => {
      const res = await request.post("/api/v0/captcha/challenge", {
        data: { siteKey: audioSiteKey, origin: ORIGIN },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.captchaMode).toBe("audio");
      expect(body.audioEnabled).toBe(true);
      expect(body.images).toBeUndefined();
    });

    test("combined siteKey returns audioEnabled and 9 images", async ({
      request,
    }) => {
      const res = await request.post("/api/v0/captcha/challenge", {
        data: { siteKey: combinedSiteKey, origin: ORIGIN },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.captchaMode).toBe("combined");
      expect(body.audioEnabled).toBe(true);
      expect(body.images).toHaveLength(9);
    });

    // ── Widget UI: audio-only ─────────────────────────────────────────────

    test("audio-only widget renders the audio CAPTCHA directly", async ({
      page,
    }) => {
      await loadWidgetWithReferer(page, audioSiteKey);
      await page.getByRole("button", { name: "I'm not a robot" }).click();

      await expect(page.getByText("Press PLAY to listen")).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText("Enter what you hear")).toBeVisible();
      await expect(page.getByRole("button", { name: /play/i })).toBeVisible();
      await expect(page.getByRole("button", { name: "Verify" })).toBeVisible();
    });

    test("audio-only widget verifies the correct text answer end-to-end", async ({
      page,
    }) => {
      await loadWidgetWithReferer(page, audioSiteKey);
      await page.getByRole("button", { name: "I'm not a robot" }).click();

      await expect(page.getByText("Enter what you hear")).toBeVisible({
        timeout: 10_000,
      });

      const verifyResp = page.waitForResponse(
        (r) =>
          r.url().includes("/api/v0/captcha/verify") &&
          r.request().method() === "POST",
      );

      await page.getByRole("textbox").fill(audioAnswer);
      await page.getByRole("button", { name: "Verify" }).click();

      const resp = await verifyResp;
      const body = await resp.json();
      expect(body.success).toBe(true);
      expect(body.token).toBeTruthy();
    });

    test("audio-only widget rejects a wrong text answer (still in widget)", async ({
      page,
    }) => {
      await loadWidgetWithReferer(page, audioSiteKey);
      await page.getByRole("button", { name: "I'm not a robot" }).click();

      await expect(page.getByText("Enter what you hear")).toBeVisible({
        timeout: 10_000,
      });

      const verifyResp = page.waitForResponse(
        (r) =>
          r.url().includes("/api/v0/captcha/verify") &&
          r.request().method() === "POST",
      );

      await page.getByRole("textbox").fill("definitely-wrong");
      await page.getByRole("button", { name: "Verify" }).click();

      const resp = await verifyResp;
      const body = await resp.json();
      expect(body.success).toBe(false);
      expect(body.token).toBeUndefined();

      // After failure, a fresh challenge is requested — the audio UI re-appears.
      await expect(page.getByText("Enter what you hear")).toBeVisible();
    });

    // ── Widget UI: combined mode toggle ───────────────────────────────────

    test("combined widget shows the image grid + a headphone toggle", async ({
      page,
    }) => {
      await loadWidgetWithReferer(page, combinedSiteKey);
      await page.getByRole("button", { name: "I'm not a robot" }).click();

      // Image grid appears (Verify button + 9 images).
      await expect(page.getByRole("button", { name: "Verify" })).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        page.getByRole("button", { name: "Switch to audio challenge" }),
      ).toBeVisible();
    });

    test("combined widget toggles to audio mode when headphone is clicked", async ({
      page,
    }) => {
      await loadWidgetWithReferer(page, combinedSiteKey);
      await page.getByRole("button", { name: "I'm not a robot" }).click();

      await page
        .getByRole("button", { name: "Switch to audio challenge" })
        .click();

      await expect(page.getByText("Press PLAY to listen")).toBeVisible({
        timeout: 5_000,
      });
      await expect(
        page.getByRole("button", { name: "Switch to image challenge" }),
      ).toBeVisible();
    });

    test("combined widget can switch back to image mode from audio", async ({
      page,
    }) => {
      await loadWidgetWithReferer(page, combinedSiteKey);
      await page.getByRole("button", { name: "I'm not a robot" }).click();

      await page
        .getByRole("button", { name: "Switch to audio challenge" })
        .click();
      await expect(page.getByText("Press PLAY to listen")).toBeVisible();

      await page
        .getByRole("button", { name: "Switch to image challenge" })
        .click();
      await expect(
        page.getByRole("button", { name: "Switch to audio challenge" }),
      ).toBeVisible();
    });

    test("combined widget verifies through the audio path end-to-end", async ({
      page,
    }) => {
      await loadWidgetWithReferer(page, combinedSiteKey);
      await page.getByRole("button", { name: "I'm not a robot" }).click();

      await page
        .getByRole("button", { name: "Switch to audio challenge" })
        .click();
      await expect(page.getByText("Enter what you hear")).toBeVisible();

      const verifyResp = page.waitForResponse(
        (r) =>
          r.url().includes("/api/v0/captcha/verify") &&
          r.request().method() === "POST",
      );

      await page.getByRole("textbox").fill(audioAnswer);
      await page.getByRole("button", { name: "Verify" }).click();

      const resp = await verifyResp;
      const body = await resp.json();
      expect(body.success).toBe(true);
      expect(body.token).toBeTruthy();
    });

    // ── Widget UI: image-only never shows the toggle ──────────────────────

    test("image-only widget does NOT show the headphone toggle", async ({
      page,
    }) => {
      const tmpName = `Image Only ${ts}`;
      const tmp = await createSiteWithKeys(page, tmpName);

      await page.goto(tmp.detailUrl);
      await page.getByRole("link", { name: "Create Puzzle" }).click();
      await page.waitForURL("**/dashboard/puzzles/new**");
      await ensureSiteSelected(page);
      await selectFirstImageSet(page);
      await page.getByPlaceholder("e.g. trains, buses, crosswalks").fill("img");
      const imgButtons = page.locator(
        'button[type="button"]:has(img[draggable="false"])',
      );
      await expect(imgButtons.first()).toBeVisible();
      for (let i = 0; i < 3; i++) await imgButtons.nth(i).click();
      await page.getByRole("button", { name: "Create Puzzle" }).click();
      await page.waitForURL("**/dashboard/sites/**");

      await loadWidgetWithReferer(page, tmp.siteKey);
      await page.getByRole("button", { name: "I'm not a robot" }).click();
      await expect(page.getByRole("button", { name: "Verify" })).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        page.getByRole("button", { name: "Switch to audio challenge" }),
      ).toBeHidden();

      await deleteSite(page, tmp.detailUrl, tmpName);
    });

    // ── Cleanup ───────────────────────────────────────────────────────────

    async function deletePuzzleByPromptText(page: Page, prompt: string) {
      await page.getByText(prompt).first().click({ button: "right" });
      await page.getByRole("menuitem", { name: "Delete Puzzle" }).click();
      await page.getByRole("button", { name: "Delete" }).click();
      await expect(page.getByText(prompt)).toBeHidden({ timeout: 10_000 });
    }

    test("cleanup: delete combined puzzle + site", async ({ page }) => {
      await page.goto(combinedSiteUrl);
      await deletePuzzleByPromptText(page, "combined-test");
      await deleteSite(page, combinedSiteUrl, combinedSiteName);
    });

    test("cleanup: delete audio-only puzzle + site", async ({ page }) => {
      await page.goto(audioSiteUrl);
      // Audio-only puzzles have empty prompt (commit c27aa29 removed the
      // `|| "Verify"` fallback); target the row link by href instead.
      const puzzleRow = page
        .locator('a[href^="/dashboard/puzzles/"]:not([href*="/new"])')
        .first();
      await puzzleRow.click({ button: "right" });
      await page.getByRole("menuitem", { name: "Delete Puzzle" }).click();
      await page.getByRole("button", { name: "Delete" }).click();
      await expect(puzzleRow).toBeHidden({ timeout: 10_000 });
      await deleteSite(page, audioSiteUrl, audioSiteName);
    });

    test("cleanup: delete the audio clip", async ({ page }) => {
      await page.goto("/dashboard/audio");
      await page.getByRole("link", { name: audioName }).click();
      await page.waitForURL("**/dashboard/audio/**");
      await page.getByRole("button", { name: "Delete Audio" }).click();
      await page.getByRole("button", { name: "Delete" }).click();
      await page.waitForURL("**/dashboard/audio", { timeout: 10_000 });
    });
  });
