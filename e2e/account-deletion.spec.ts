import { neon } from "@neondatabase/serverless";
import { expect, type Page, test } from "@playwright/test";
import {
  createSiteWithKeys,
  ensureSiteSelected,
  fillAudioFields,
  selectCaptchaMode,
  uploadAudioClip,
} from "./helpers";

/**
 * Exercises the full delete-account flow with a populated account
 * (audio + site + puzzle). Catches:
 *   - React render errors in the destructive 4-step dialog
 *   - FK violations during the user → imageSet cascade on delete
 *   - Re-signup with the same email after cascade
 *
 * Lives in one test because it uses an isolated auth context — a per-test
 * `storageState` override would reset cookies between sub-tests, kicking
 * us out of the dashboard mid-flow. `test.step` gives per-section timing
 * in the HTML report without breaking that constraint.
 *
 * Cleanup of the recreated account is handled by `global-teardown.ts`,
 * which sweeps any `delete-me-%@ycaptcha.test` rows and their R2 keys.
 */

async function signUp(
  page: Page,
  { name, email, password }: { name: string; email: string; password: string },
) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Sign Up" }).click();

  // .test placeholder emails skip the verification email; the user lands on
  // a "Check your inbox" card and stays unverified. Force-verify via SQL,
  // then sign in.
  const onCheckEmail = await page
    .getByText(/check your inbox|verification link/i)
    .first()
    .waitFor({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (onCheckEmail) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL required to verify e2e test user");
    }
    const sql = neon(databaseUrl);
    await sql`
      UPDATE "user" SET email_verified = true WHERE email = ${email}
    `;

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
  }

  await page.waitForURL("**/dashboard**", { timeout: 10_000 });
}

async function deleteAccountThroughDialog(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/dashboard/settings");
  await page.getByRole("button", { name: "Delete Account" }).click();
  await page.getByRole("button", { name: "I understand, continue" }).click();
  await page.getByLabel("Your email").fill(email);
  await page.getByLabel(/Type "delete my account"/).fill("delete my account");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Password").fill(password);
  await page
    .getByRole("button", { name: "Permanently delete my account" })
    .click();
  await page.waitForURL("**/login**", { timeout: 15_000 });
}

test.describe("Account deletion — populated user", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signup → populate → delete → no React/FK errors → re-signup", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const ts = Date.now();
    const email = `delete-me-${ts}@ycaptcha.test`;
    const password = "DeleteMePassword123!";
    const name = "Delete Me";
    const audioName = `dme-audio-${ts}`;
    const siteName = `Delete Me Site ${ts}`;

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await test.step("sign up", () => signUp(page, { name, email, password }));

    await test.step("populate: audio + site + audio-only puzzle", async () => {
      await uploadAudioClip(page, audioName);
      await createSiteWithKeys(page, siteName);

      await page.goto("/dashboard/puzzles/new");
      await ensureSiteSelected(page);
      await selectCaptchaMode(page, "Audio only");
      await fillAudioFields(page, "anything");
      await page.getByRole("button", { name: "Create Puzzle" }).click();
      await page.waitForURL("**/dashboard/sites/**", { timeout: 10_000 });
    });

    await test.step("delete dialog renders without t.rich function-as-child", async () => {
      await page.goto("/dashboard/settings");
      await page.getByRole("button", { name: "Delete Account" }).click();
      await page
        .getByRole("button", { name: "I understand, continue" })
        .click();
      await expect(page.getByLabel("Your email")).toBeVisible();
      // Scope to the destructive panel so we don't match the ProfileSection
      // email input's value attribute.
      await expect(
        page.locator(".border-destructive\\/50").getByText(email),
      ).toBeVisible();

      expect(
        consoleErrors.filter((e) =>
          e.includes("Functions are not valid as a React child"),
        ),
      ).toEqual([]);
    });

    await test.step("destructive flow runs without FK violation", async () => {
      // Continue from the dialog already at step 3.
      await page.getByLabel("Your email").fill(email);
      await page
        .getByLabel(/Type "delete my account"/)
        .fill("delete my account");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByLabel("Password").fill(password);
      await page
        .getByRole("button", { name: "Permanently delete my account" })
        .click();
      // A 500 from the puzzle FK cascade would leave us on the settings page.
      await page.waitForURL("**/login**", { timeout: 15_000 });

      expect(
        consoleErrors.filter(
          (e) =>
            e.toLowerCase().includes("failed query") ||
            e.toLowerCase().includes("foreign key"),
        ),
      ).toEqual([]);
    });

    await test.step("re-signup succeeds and dashboard is empty", async () => {
      await signUp(page, { name, email, password });

      await page.goto("/dashboard/audio");
      await expect(page.getByRole("link", { name: audioName })).toBeHidden();
      await page.goto("/dashboard/sites");
      await expect(page.getByText(siteName)).toBeHidden();
    });

    await test.step("delete the recreated account so re-runs are idempotent", () =>
      deleteAccountThroughDialog(page, email, password));
  });
});
