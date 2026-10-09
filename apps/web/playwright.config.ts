import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3041);
const githubMockPort = Number(process.env.PLAYWRIGHT_GITHUB_MOCK_PORT ?? 3052);
const baseURL = `http://127.0.0.1:${port}`;
const githubMockURL = `http://127.0.0.1:${githubMockPort}`;
const databasePath = fileURLToPath(new URL("./.test/db/e2e.sqlite", import.meta.url));
const databaseUrl = process.env.TEST_DATABASE_URL ?? `file:${databasePath}`;
/** `pnpm test:e2e:smoke`: only `@smoke` tests, and global setup warms only their routes. */
const smoke = process.env.E2E_SMOKE === "true";

export default defineConfig({
  testDir: "./e2e",
  ...(smoke ? { grep: /@smoke/ } : {}),
  globalSetup: "./e2e/support/global-setup.ts",
  // Each full page load re-reads the local SQLite DB from OPFS (~10s under parallel load).
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    testIdAttribute: "data-test",
  },
  webServer: [
    {
      command: `pnpm exec node ./scripts/mock-github-api.mjs`,
      url: githubMockURL,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        PLAYWRIGHT_GITHUB_MOCK_PORT: String(githubMockPort),
      },
    },
    {
      command: `pnpm exec node ./scripts/setup-test-db.mjs && pnpm exec vp dev --port ${port}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: databaseUrl,
        DATABASE_AUTH_TOKEN: "",
        BETTER_AUTH_SECRET: "playwright-test-secret-at-least-32-characters",
        GITHUB_CLIENT_ID: "playwright-github-client-id",
        GITHUB_CLIENT_SECRET: "playwright-github-client-secret",
        GITHUB_API_BASE_URL: githubMockURL,
        FRONTEND_URL: baseURL,
        VITE_API_URL: baseURL,
        TEST_DB_RESET: "true",
        VITE_E2E: "true",
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
