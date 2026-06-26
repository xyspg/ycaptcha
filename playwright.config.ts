import { defineConfig, devices } from "@playwright/test";

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
    // .env.local first, .env.test last — bun's later --env-file overrides the
    // earlier one. The refactor branch's .env.local sets refactor-only URLs
    // (api.ycaptcha.localhost, etc.) that must NOT leak into the legacy
    // monolith webServer; .env.test pins everything monolith-relevant back to
    // localhost:3000.
    command: "bun --env-file=.env.local --env-file=.env.test next dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
  },
});
