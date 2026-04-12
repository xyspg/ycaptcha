import { expect, test } from "@playwright/test";
import { importSampleSet } from "./helpers";

/**
 * Image dedup & R2 orphan protection:
 *   - Two sets with same content hashes share R2 files
 *   - Deleting one set doesn't break the other's images
 *   - Sample images (/samples/) are never deleted from R2
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
      setAUrl = await importSampleSet(page);
      await expect(page.getByText("(13)")).toBeVisible({ timeout: 10_000 });

      // Extract image URLs from Set A
      const imgs = page.locator('img[src*="r2.ycaptcha"]');
      expect(await imgs.count()).toBe(13);
      for (let i = 0; i < 13; i++) {
        const src = await imgs.nth(i).getAttribute("src");
        if (src) imageUrls.push(src);
      }

      setBUrl = await importSampleSet(page);
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

    // ── Sample images protected after both sets deleted ─────────────────

    test("delete Set B → sample URLs still accessible", async ({
      page,
      request,
    }) => {
      await page.goto(setBUrl);
      await page.getByRole("button", { name: "Delete Image Set" }).click();
      await page.getByRole("button", { name: "Delete" }).click();
      await page.waitForURL("**/dashboard/image-sets", { timeout: 10_000 });

      // /samples/ URLs are protected from R2 deletion
      for (const url of imageUrls.slice(0, 3)) {
        expect(url).toContain("/samples/");
        const resp = await request.get(url);
        expect(resp.status()).toBe(200);
      }
    });

    // ── Individual image deletion respects reference counting ───────────

    let setCUrl: string;
    let setDUrl: string;
    let deletedImageUrl: string;

    test("import sets C + D, delete single image from C", async ({ page }) => {
      setCUrl = await importSampleSet(page);
      await expect(page.getByText("(13)")).toBeVisible({ timeout: 10_000 });

      setDUrl = await importSampleSet(page);
      await expect(page.getByText("(13)")).toBeVisible({ timeout: 10_000 });

      // Go to Set C and delete one image
      await page.goto(setCUrl);
      await expect(page.getByText("(13)")).toBeVisible({ timeout: 10_000 });

      const firstImg = page.locator('img[src*="r2.ycaptcha"]').first();
      deletedImageUrl = (await firstImg.getAttribute("src")) ?? "";
      expect(deletedImageUrl).toBeTruthy();

      const firstCard = page
        .locator("div.group")
        .filter({ has: page.locator('img[src*="r2.ycaptcha"]') })
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
