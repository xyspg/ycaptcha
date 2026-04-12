import { expect, test } from "@playwright/test";
import {
  createSiteWithKeys,
  deleteSite,
  ensureSiteSelected,
  importSampleSet,
  ORIGIN,
  selectFirstImageSet,
} from "./helpers";

/**
 * Scoring formula: requiredCount = max(1, ceil(correctCount * difficulty))
 *   score = correctSelections - wrongSelections
 *   pass  = score >= requiredCount && uniqueIndices.length !== 9
 *
 * Easy (0.25): requiredCount = 1.  Hard (0.75): requiredCount = 3.
 * Both have correctCount=3, 4 images tagged correct.
 */
test.describe
  .serial("CAPTCHA verification scoring logic", () => {
    const ts = Date.now();
    const easySiteName = `Easy Site ${ts}`;
    const hardSiteName = `Hard Site ${ts}`;

    let easySiteKey: string;
    let easySiteDetailUrl: string;
    let hardSiteKey: string;
    let hardSiteDetailUrl: string;

    async function createPuzzle(
      page: import("@playwright/test").Page,
      siteDetailUrl: string,
      prompt: string,
      difficulty: "Easy" | "Hard",
    ): Promise<void> {
      await page.goto(siteDetailUrl);
      await page.getByRole("link", { name: "Create Puzzle" }).click();
      await page.waitForURL("**/dashboard/puzzles/new**");

      await ensureSiteSelected(page);
      await selectFirstImageSet(page);

      await page
        .getByPlaceholder("e.g. trains, buses, crosswalks")
        .fill(prompt);

      const imageButtons = page.locator(
        'button[type="button"]:has(img[draggable="false"])',
      );
      await expect(imageButtons.first()).toBeVisible();
      for (let i = 0; i < 4; i++) {
        await imageButtons.nth(i).click();
      }

      await page.getByText("Advanced Settings").click();
      await expect(
        page.getByRole("button", { name: difficulty }),
      ).toBeVisible();
      await page.getByRole("button", { name: difficulty }).click();

      await page.getByRole("button", { name: "Create Puzzle" }).click();
      await page.waitForURL("**/dashboard/sites/**", { timeout: 10_000 });
    }

    // ── Setup ──────────────────────────────────────────────────────────

    test("setup: ensure sample image set exists", async ({ page }) => {
      await page.goto("/dashboard/image-sets");
      const hasImported = await page
        .getByRole("link")
        .filter({ hasText: "Tech Stacks" })
        .count();
      if (hasImported === 0) {
        await importSampleSet(page);
      }
    });

    test("setup: create easy site (difficulty Easy = 0.25)", async ({
      page,
    }) => {
      const result = await createSiteWithKeys(page, easySiteName);
      easySiteKey = result.siteKey;
      easySiteDetailUrl = result.detailUrl;
      await createPuzzle(page, easySiteDetailUrl, "easy scoring test", "Easy");
    });

    test("setup: create hard site (difficulty Hard = 0.75)", async ({
      page,
    }) => {
      const result = await createSiteWithKeys(page, hardSiteName);
      hardSiteKey = result.siteKey;
      hardSiteDetailUrl = result.detailUrl;
      await createPuzzle(page, hardSiteDetailUrl, "hard scoring test", "Hard");
    });

    // ── Deterministic edge cases ───────────────────────────────────────

    test("all 9 → always fails (easy)", async ({ request }) => {
      const { sessionToken } = await (
        await request.post("/api/v0/captcha/challenge", {
          data: { siteKey: easySiteKey, origin: ORIGIN },
        })
      ).json();
      const body = await (
        await request.post("/api/v0/captcha/verify", {
          data: { sessionToken, selectedIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
        })
      ).json();
      expect(body.success).toBe(false);
    });

    test("all 9 → always fails (hard)", async ({ request }) => {
      const { sessionToken } = await (
        await request.post("/api/v0/captcha/challenge", {
          data: { siteKey: hardSiteKey, origin: ORIGIN },
        })
      ).json();
      const body = await (
        await request.post("/api/v0/captcha/verify", {
          data: { sessionToken, selectedIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
        })
      ).json();
      expect(body.success).toBe(false);
    });

    test("0 selections → always fails", async ({ request }) => {
      const { sessionToken } = await (
        await request.post("/api/v0/captcha/challenge", {
          data: { siteKey: easySiteKey, origin: ORIGIN },
        })
      ).json();
      const body = await (
        await request.post("/api/v0/captcha/verify", {
          data: { sessionToken, selectedIndices: [] },
        })
      ).json();
      expect(body.success).toBe(false);
    });

    // ── Wrong > correct penalty ────────────────────────────────────────

    test("8/9 always fails: wrong penalty too high", async ({ request }) => {
      // 3 correct in 9. Select 8 → 3 correct + 5 wrong. score = -2. Fails.
      for (let i = 0; i < 3; i++) {
        const { sessionToken } = await (
          await request.post("/api/v0/captcha/challenge", {
            data: { siteKey: easySiteKey, origin: ORIGIN },
          })
        ).json();
        const body = await (
          await request.post("/api/v0/captcha/verify", {
            data: { sessionToken, selectedIndices: [0, 1, 2, 3, 4, 5, 6, 7] },
          })
        ).json();
        expect(body.success).toBe(false);
      }
    });

    test("7/9 always fails: more wrong than correct", async ({ request }) => {
      const { sessionToken } = await (
        await request.post("/api/v0/captcha/challenge", {
          data: { siteKey: easySiteKey, origin: ORIGIN },
        })
      ).json();
      const body = await (
        await request.post("/api/v0/captcha/verify", {
          data: { sessionToken, selectedIndices: [0, 1, 2, 3, 4, 5, 6] },
        })
      ).json();
      expect(body.success).toBe(false);
    });

    test("6/9 always fails: wrong penalty dominates", async ({ request }) => {
      // Best case: 3c+3w ��� score=0 < requiredCount(1). Always fails.
      for (let i = 0; i < 3; i++) {
        const { sessionToken } = await (
          await request.post("/api/v0/captcha/challenge", {
            data: { siteKey: easySiteKey, origin: ORIGIN },
          })
        ).json();
        const body = await (
          await request.post("/api/v0/captcha/verify", {
            data: { sessionToken, selectedIndices: [0, 1, 2, 3, 4, 5] },
          })
        ).json();
        expect(body.success).toBe(false);
      }
    });

    test("5/9 with hard difficulty: always fails", async ({ request }) => {
      // Best case: 3c+2w → score=1 < requiredCount(3). Always fails.
      for (let i = 0; i < 3; i++) {
        const { sessionToken } = await (
          await request.post("/api/v0/captcha/challenge", {
            data: { siteKey: hardSiteKey, origin: ORIGIN },
          })
        ).json();
        const body = await (
          await request.post("/api/v0/captcha/verify", {
            data: { sessionToken, selectedIndices: [0, 1, 2, 3, 4] },
          })
        ).json();
        expect(body.success).toBe(false);
      }
    });

    // ── Statistical: easy vs hard pass rates ───────────────────────────

    test("easy puzzle: 3 random selections sometimes passes", async ({
      request,
    }) => {
      let successes = 0;
      for (let i = 0; i < 30; i++) {
        const { sessionToken } = await (
          await request.post("/api/v0/captcha/challenge", {
            data: { siteKey: easySiteKey, origin: ORIGIN },
          })
        ).json();
        const body = await (
          await request.post("/api/v0/captcha/verify", {
            data: { sessionToken, selectedIndices: [0, 1, 2] },
          })
        ).json();
        if (body.success) successes++;
      }
      expect(successes).toBeGreaterThan(0);
      expect(successes).toBeLessThan(30);
    });

    test("hard puzzle: 3 random selections rarely passes", async ({
      request,
    }) => {
      let successes = 0;
      for (let i = 0; i < 20; i++) {
        const { sessionToken } = await (
          await request.post("/api/v0/captcha/challenge", {
            data: { siteKey: hardSiteKey, origin: ORIGIN },
          })
        ).json();
        const body = await (
          await request.post("/api/v0/captcha/verify", {
            data: { sessionToken, selectedIndices: [0, 1, 2] },
          })
        ).json();
        if (body.success) successes++;
      }
      expect(successes).toBeLessThanOrEqual(3);
    });

    test("easy puzzle: single correct image can pass", async ({ request }) => {
      let successes = 0;
      for (let i = 0; i < 30; i++) {
        const { sessionToken } = await (
          await request.post("/api/v0/captcha/challenge", {
            data: { siteKey: easySiteKey, origin: ORIGIN },
          })
        ).json();
        const body = await (
          await request.post("/api/v0/captcha/verify", {
            data: { sessionToken, selectedIndices: [0] },
          })
        ).json();
        if (body.success) successes++;
      }
      expect(successes).toBeGreaterThan(0);
      expect(successes).toBeLessThan(30);
    });

    test("hard puzzle: single image never passes", async ({ request }) => {
      // requiredCount=3. Single correct → score=1<3. Always fails.
      let failures = 0;
      for (let i = 0; i < 10; i++) {
        const { sessionToken } = await (
          await request.post("/api/v0/captcha/challenge", {
            data: { siteKey: hardSiteKey, origin: ORIGIN },
          })
        ).json();
        const body = await (
          await request.post("/api/v0/captcha/verify", {
            data: { sessionToken, selectedIndices: [0] },
          })
        ).json();
        if (!body.success) failures++;
      }
      expect(failures).toBe(10);
    });

    // ── Cleanup ────────────────────────────────────────────────────────

    test("cleanup: delete easy site", async ({ page }) => {
      await deleteSite(page, easySiteDetailUrl, easySiteName);
    });

    test("cleanup: delete hard site", async ({ page }) => {
      await deleteSite(page, hardSiteDetailUrl, hardSiteName);
    });
  });
