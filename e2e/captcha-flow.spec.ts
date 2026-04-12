import { expect, test } from "@playwright/test";
import {
  createSiteWithKeys,
  deleteSite,
  getVerificationToken,
  importSampleSet,
  ORIGIN,
  selectFirstImageSet,
} from "./helpers";

test.describe
  .serial("CAPTCHA API verification flow", () => {
    let siteKey: string;
    let secretKey: string;
    let siteDetailUrl: string;

    const siteName = `CAPTCHA API Test ${Date.now()}`;
    const puzzlePrompt = "frontend toolchains (API test)";

    // ── Setup ──────────────────────────────────────────────────────────

    test("setup: create site and extract keys", async ({ page }) => {
      const keys = await createSiteWithKeys(page, siteName);
      siteKey = keys.siteKey;
      secretKey = keys.secretKey;
      siteDetailUrl = keys.detailUrl;
    });

    test("setup: import sample image set", async ({ page }) => {
      await importSampleSet(page);
    });

    test("setup: create puzzle with 4 correct images", async ({ page }) => {
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
      expect(await imageButtons.count()).toBeGreaterThanOrEqual(4);
      for (let i = 0; i < 4; i++) {
        await imageButtons.nth(i).click();
      }

      // Easy difficulty (requiredCount=1) so single-image retry has 33% pass rate
      await page.getByText("Advanced Settings").click();
      await expect(page.getByRole("button", { name: "Easy" })).toBeVisible();
      await page.getByRole("button", { name: "Easy" }).click();

      await page.getByRole("button", { name: "Create Puzzle" }).click();
      await page.waitForURL("**/dashboard/sites/**", { timeout: 10_000 });
      await expect(page.getByText(puzzlePrompt)).toBeVisible();
    });

    // ── Challenge endpoint ─────────────────────────────────────────────

    test("challenge returns session token, prompt, and 9 proxy URLs", async ({
      request,
    }) => {
      const res = await request.post("/api/v0/captcha/challenge", {
        data: { siteKey, origin: ORIGIN },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.sessionToken).toBeTruthy();
      expect(body.prompt).toBe(puzzlePrompt);
      expect(body.images).toHaveLength(9);
      for (const img of body.images) {
        expect(img.url).toMatch(/\/api\/v0\/captcha\/image\/.+\/\d+/);
      }
    });

    test("challenge rejects missing siteKey", async ({ request }) => {
      const res = await request.post("/api/v0/captcha/challenge", {
        data: {},
      });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe("Missing siteKey");
    });

    test("challenge rejects invalid siteKey", async ({ request }) => {
      const res = await request.post("/api/v0/captcha/challenge", {
        data: { siteKey: "pk_nonexistent_12345678" },
      });
      expect(res.status()).toBe(404);
      expect((await res.json()).error).toBe("Invalid siteKey");
    });

    // ── Image proxy ────────────────────────────────────────────────────

    test("image proxy serves all 9 challenge images", async ({ request }) => {
      const { images } = await (
        await request.post("/api/v0/captcha/challenge", {
          data: { siteKey, origin: ORIGIN },
        })
      ).json();

      for (let i = 0; i < 9; i++) {
        const imgRes = await request.get(images[i].url);
        expect(imgRes.status()).toBe(200);
        expect(imgRes.headers()["content-type"]).toMatch(/^image\//);
      }
    });

    test("image proxy rejects out-of-range index", async ({ request }) => {
      const { sessionToken } = await (
        await request.post("/api/v0/captcha/challenge", {
          data: { siteKey, origin: ORIGIN },
        })
      ).json();
      expect(
        (
          await request.get(`/api/v0/captcha/image/${sessionToken}/99`)
        ).status(),
      ).toBe(400);
    });

    test("image proxy rejects invalid session token", async ({ request }) => {
      expect(
        (await request.get("/api/v0/captcha/image/fake-token-000/0")).status(),
      ).toBe(404);
    });

    // ── Verify endpoint ────────────────────────────────────────────────

    test("verify: happy path (challenge → verify → siteverify)", async ({
      request,
    }) => {
      const token = await getVerificationToken(request, siteKey);

      const svBody = await (
        await request.post("/api/v0/captcha/siteverify", {
          data: { token, secretKey },
        })
      ).json();
      expect(svBody.success).toBe(true);
    });

    test("verify: all 9 always fails (anti-bot)", async ({ request }) => {
      const { sessionToken } = await (
        await request.post("/api/v0/captcha/challenge", {
          data: { siteKey, origin: ORIGIN },
        })
      ).json();

      const body = await (
        await request.post("/api/v0/captcha/verify", {
          data: { sessionToken, selectedIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
        })
      ).json();
      expect(body.success).toBe(false);
      expect(body.token).toBeUndefined();
    });

    test("verify: 0 selections fails", async ({ request }) => {
      const { sessionToken } = await (
        await request.post("/api/v0/captcha/challenge", {
          data: { siteKey, origin: ORIGIN },
        })
      ).json();

      const body = await (
        await request.post("/api/v0/captcha/verify", {
          data: { sessionToken, selectedIndices: [] },
        })
      ).json();
      expect(body.success).toBe(false);
    });

    test("verify: 8/9 always fails (wrong penalty dominates)", async ({
      request,
    }) => {
      for (let i = 0; i < 3; i++) {
        const { sessionToken } = await (
          await request.post("/api/v0/captcha/challenge", {
            data: { siteKey, origin: ORIGIN },
          })
        ).json();

        const body = await (
          await request.post("/api/v0/captcha/verify", {
            data: {
              sessionToken,
              selectedIndices: [0, 1, 2, 3, 4, 5, 6, 7],
            },
          })
        ).json();
        expect(body.success).toBe(false);
      }
    });

    test("verify: 7/9 always fails (wrong penalty)", async ({ request }) => {
      const { sessionToken } = await (
        await request.post("/api/v0/captcha/challenge", {
          data: { siteKey, origin: ORIGIN },
        })
      ).json();

      const body = await (
        await request.post("/api/v0/captcha/verify", {
          data: { sessionToken, selectedIndices: [0, 1, 2, 3, 4, 5, 6] },
        })
      ).json();
      expect(body.success).toBe(false);
    });

    test("verify: 6/9 mostly fails (early-fail strategy)", async ({
      request,
    }) => {
      let failures = 0;
      const rounds = 5;
      for (let i = 0; i < rounds; i++) {
        const { sessionToken } = await (
          await request.post("/api/v0/captcha/challenge", {
            data: { siteKey, origin: ORIGIN },
          })
        ).json();

        const body = await (
          await request.post("/api/v0/captcha/verify", {
            data: { sessionToken, selectedIndices: [0, 1, 2, 3, 4, 5] },
          })
        ).json();
        if (!body.success) failures++;
      }
      expect(failures).toBeGreaterThanOrEqual(4);
    });

    test("verify: session consumed — no replay", async ({ request }) => {
      const { sessionToken } = await (
        await request.post("/api/v0/captcha/challenge", {
          data: { siteKey, origin: ORIGIN },
        })
      ).json();

      await request.post("/api/v0/captcha/verify", {
        data: { sessionToken, selectedIndices: [0, 1] },
      });

      const res = await request.post("/api/v0/captcha/verify", {
        data: { sessionToken, selectedIndices: [0, 1] },
      });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toContain("Invalid or expired session");
    });

    test("verify: rejects invalid session token", async ({ request }) => {
      const res = await request.post("/api/v0/captcha/verify", {
        data: { sessionToken: "fake-token-xyz", selectedIndices: [0, 1] },
      });
      expect(res.status()).toBe(400);
    });

    test("verify: rejects missing fields", async ({ request }) => {
      expect(
        (
          await request.post("/api/v0/captcha/verify", {
            data: { sessionToken: "tok" },
          })
        ).status(),
      ).toBe(400);

      expect(
        (
          await request.post("/api/v0/captcha/verify", {
            data: { selectedIndices: [0] },
          })
        ).status(),
      ).toBe(400);
    });

    test("verify: rejects out-of-range indices", async ({ request }) => {
      const { sessionToken } = await (
        await request.post("/api/v0/captcha/challenge", {
          data: { siteKey, origin: ORIGIN },
        })
      ).json();

      const res = await request.post("/api/v0/captcha/verify", {
        data: { sessionToken, selectedIndices: [0, 10] },
      });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe("Invalid indices");
    });

    test("verify: duplicate indices are deduplicated", async ({ request }) => {
      const { sessionToken } = await (
        await request.post("/api/v0/captcha/challenge", {
          data: { siteKey, origin: ORIGIN },
        })
      ).json();

      const res = await request.post("/api/v0/captcha/verify", {
        data: { sessionToken, selectedIndices: [0, 0, 1, 1] },
      });
      expect(res.status()).toBe(200);
      expect(typeof (await res.json()).success).toBe("boolean");
    });

    // ── Siteverify ─────────────────────────────────────────────────────

    test("siteverify: replay protection", async ({ request }) => {
      const token = await getVerificationToken(request, siteKey);

      const first = await (
        await request.post("/api/v0/captcha/siteverify", {
          data: { token, secretKey },
        })
      ).json();
      expect(first.success).toBe(true);

      const second = await (
        await request.post("/api/v0/captcha/siteverify", {
          data: { token, secretKey },
        })
      ).json();
      expect(second.success).toBe(false);
    });

    test("siteverify: wrong secret key", async ({ request }) => {
      const token = await getVerificationToken(request, siteKey);

      const res = await (
        await request.post("/api/v0/captcha/siteverify", {
          data: { token, secretKey: "sk_INVALID" },
        })
      ).json();
      expect(res.success).toBe(false);
    });

    test("siteverify: missing fields", async ({ request }) => {
      const r1 = await request.post("/api/v0/captcha/siteverify", {
        data: { token: "t" },
      });
      expect(r1.status()).toBe(400);

      const r2 = await request.post("/api/v0/captcha/siteverify", {
        data: { secretKey: "k" },
      });
      expect(r2.status()).toBe(400);
    });

    // ── Puzzle toggle (enabled/disabled) ───────────────────────────────

    test("toggle: disable puzzle → challenge returns 404", async ({
      page,
      request,
    }) => {
      await page.goto(siteDetailUrl);

      const puzzleRow = page
        .locator("div")
        .filter({ hasText: puzzlePrompt })
        .filter({ has: page.locator("[role='switch']") })
        .first();
      const toggle = puzzleRow.locator("[role='switch']");

      await expect(toggle).toHaveAttribute("data-state", "checked");
      await toggle.click();
      await expect(toggle).toHaveAttribute("data-state", "unchecked");
      await page.waitForTimeout(1000);

      const res = await request.post("/api/v0/captcha/challenge", {
        data: { siteKey, origin: ORIGIN },
      });
      expect(res.status()).toBe(404);
      expect((await res.json()).error).toBe(
        "No puzzles configured for this site",
      );
    });

    test("toggle: re-enable puzzle → challenge works again", async ({
      page,
      request,
    }) => {
      await page.goto(siteDetailUrl);

      const puzzleRow = page
        .locator("div")
        .filter({ hasText: puzzlePrompt })
        .filter({ has: page.locator("[role='switch']") })
        .first();
      const toggle = puzzleRow.locator("[role='switch']");

      await expect(toggle).toHaveAttribute("data-state", "unchecked");
      await toggle.click();
      await expect(toggle).toHaveAttribute("data-state", "checked");
      await page.waitForTimeout(1000);

      const res = await request.post("/api/v0/captcha/challenge", {
        data: { siteKey, origin: ORIGIN },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.sessionToken).toBeTruthy();
      expect(body.prompt).toBe(puzzlePrompt);
    });

    // ── Cleanup ────────────────────────────────────────────────────────

    test("cleanup: delete test site", async ({ page }) => {
      await deleteSite(page, siteDetailUrl, siteName);
    });
  });
