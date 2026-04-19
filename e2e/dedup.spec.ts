import { expect, test } from "@playwright/test";
import { importSampleSet } from "./helpers";

/**
 * Image dedup & R2 orphan protection:
 *   - Two sets with same content hashes share R2 files
 *   - Deleting one set doesn't break the other's images
 *   - Deleting the last referencing set reaps the R2 object
 *   - Individual image deletion respects cross-set reference counting
 */
test.describe
  .serial("Image deduplication & R2 orphan protection", () => {
    let setAUrl: string;
    let setBUrl: string;
    const imageUrls: string[] = [];

    // ── Setup ──────────────────────────────────────────────────────────

    test("import sample set twice (Set A + B) and extract URLs", async ({
      page,
    }) => {
      setAUrl = await importSampleSet(page, { seed: "dedup" });
      await expect(page.getByText("(13)")).toBeVisible({ timeout: 10_000 });

      // Extract image URLs from Set A
      const imgs = page.locator('img[src*="ycaptcha.xyspg.moe"]');
      expect(await imgs.count()).toBe(13);
      for (let i = 0; i < 13; i++) {
        const src = await imgs.nth(i).getAttribute("src");
        if (src) imageUrls.push(src);
      }

      setBUrl = await importSampleSet(page, { seed: "dedup" });
      await expect(page.getByText("(13)")).toBeVisible({ timeout: 10_000 });
    });

    // ── Deleting Set A doesn't break Set B ─────────────────────────────

    test("delete Set A → Set B still has 13 images", async ({
      page,
      request,
    }) => {
      await page.goto(setAUrl);
      await page.getByRole("button", { name: "Delete Image Set" }).click();
      await page.getByRole("button", { name: "Delete" }).click();
      await page.waitForURL("**/dashboard/image-sets", { timeout: 10_000 });

      await page.goto(setBUrl);
      await expect(page.getByText("(13)")).toBeVisible({ timeout: 10_000 });

      // R2 URLs still accessible
      for (const url of imageUrls.slice(0, 3)) {
        const resp = await request.get(url);
        expect(resp.status()).toBe(200);
        expect(resp.headers()["content-type"] ?? "").toMatch(/^image\//);
      }
    });

    // ── Deleting the last referencing set completes without error ──────

    test("delete Set B → redirects to /dashboard/image-sets", async ({
      page,
    }) => {
      await page.goto(setBUrl);
      await page.getByRole("button", { name: "Delete Image Set" }).click();
      await page.getByRole("button", { name: "Delete" }).click();
      await page.waitForURL("**/dashboard/image-sets", { timeout: 10_000 });

      // The deleted set should not be reachable from the listing anymore.
      // R2 refcount cleanup is covered by the integration suite —
      // __tests__/integration/gallery.test.ts — which can read the DB
      // directly instead of relying on CDN eventual consistency.
      const setBHref = new URL(setBUrl).pathname;
      await expect(page.locator(`a[href="${setBHref}"]`)).toHaveCount(0);
    });

    // ── Individual image deletion respects reference counting ───────────

    let setCUrl: string;
    let setDUrl: string;
    let deletedImageUrl: string;

    test("import sets C + D, delete single image from C", async ({ page }) => {
      setCUrl = await importSampleSet(page, { seed: "dedup" });
      await expect(page.getByText("(13)")).toBeVisible({ timeout: 10_000 });

      setDUrl = await importSampleSet(page, { seed: "dedup" });
      await expect(page.getByText("(13)")).toBeVisible({ timeout: 10_000 });

      // Go to Set C and delete one image
      await page.goto(setCUrl);
      await expect(page.getByText("(13)")).toBeVisible({ timeout: 10_000 });

      const firstImg = page.locator('img[src*="ycaptcha.xyspg.moe"]').first();
      deletedImageUrl = (await firstImg.getAttribute("src")) ?? "";
      expect(deletedImageUrl).toBeTruthy();

      const firstCard = page
        .locator("div.group")
        .filter({ has: page.locator('img[src*="ycaptcha.xyspg.moe"]') })
        .first();
      await firstCard.hover();
      await firstCard.locator('button[type="submit"]').click({ force: true });

      await expect(page.getByText("(12)")).toBeVisible({ timeout: 10_000 });
    });

    test("deleted image still accessible in Set D", async ({
      page,
      request,
    }) => {
      await page.goto(setDUrl);
      await expect(page.getByText("(13)")).toBeVisible({ timeout: 10_000 });

      const resp = await request.get(deletedImageUrl);
      expect(resp.status()).toBe(200);
      expect(resp.headers()["content-type"] ?? "").toMatch(/^image\//);
    });

    // ── Cleanup ────────────────────────────────────────────────────────

    test("cleanup: delete Set C and D", async ({ page }) => {
      await page.goto(setCUrl);
      await page.getByRole("button", { name: "Delete Image Set" }).click();
      await page.getByRole("button", { name: "Delete" }).click();
      await page.waitForURL("**/dashboard/image-sets", { timeout: 10_000 });

      await page.goto(setDUrl);
      await page.getByRole("button", { name: "Delete Image Set" }).click();
      await page.getByRole("button", { name: "Delete" }).click();
      await page.waitForURL("**/dashboard/image-sets", { timeout: 10_000 });
    });
  });
