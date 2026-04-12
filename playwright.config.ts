import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Load .env.test so DATABASE_URL is available for global teardown
dotenv.config({ path: ".env.test" });

const authFile = "e2e/.auth/user.json";

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      testIgnore: /dashboard\.spec\.ts|widget\.spec\.ts/,
      dependencies: ["setup"],
    },
    {
      name: "no-auth",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /dashboard\.spec\.ts|widget\.spec\.ts/,
    },
  ],
  webServer: {
    // .env.test first so its DATABASE_URL (test db) wins over .env.local
    command: "bun --env-file=.env.test --env-file=.env.local next dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
  },
});
