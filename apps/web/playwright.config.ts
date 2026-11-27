import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3041);
const nestPort = Number(process.env.PLAYWRIGHT_NEST_PORT ?? 5041);
const githubMockPort = Number(process.env.PLAYWRIGHT_GITHUB_MOCK_PORT ?? 3052);
const baseURL = `http://127.0.0.1:${port}`;
const nestOrigin = `http://127.0.0.1:${nestPort}`;
const githubMockURL = `http://127.0.0.1:${githubMockPort}`;
const postgresUrl =
  process.env.E2E_POSTGRES_URL ??
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:55439/ajr_web_e2e";
/** `pnpm test:e2e:smoke`: only `@smoke` tests, and global setup warms only their routes. */
const smoke = process.env.E2E_SMOKE === "true";

export default defineConfig({
  testDir: "./e2e",
  ...(smoke ? { grep: /@smoke/ } : {}),
  globalSetup: "./e2e/support/global-setup.ts",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    testIdAttribute: "data-test",
  },
  webServer: [
    {
      command: `pnpm exec tsx ./scripts/mock-github-api.ts`,
      url: githubMockURL,
      reuseExistingServer: true,
      timeout: 30_000,
      env: { PLAYWRIGHT_GITHUB_MOCK_PORT: String(githubMockPort) },
    },
    {
      command:
        "pnpm exec tsx ./scripts/setup-postgres.ts && " +
        "pnpm --filter @repo/db db:migrate:postgres && " +
        "pnpm --dir ../nest build && " +
        "pnpm --dir ../nest start:prod",
      url: `${nestOrigin}/health`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        NODE_ENV: "test",
        PORT: String(nestPort),
        POSTGRES_URL: postgresUrl,
        POSTGRES_POOL_MAX: "2",
        BETTER_AUTH_SECRET: "playwright-test-secret-at-least-32-characters",
        BETTER_AUTH_URL: nestOrigin,
        FRONTEND_URL: baseURL,
        GITHUB_CLIENT_ID: "playwright-github-client-id",
        GITHUB_CLIENT_SECRET: "playwright-github-client-secret",
        GITHUB_API_BASE_URL: githubMockURL,
        ADMIN_BYPASS_SECRET: "",
        OBSERVE_APP_KEY: "",
        OBSERVE_APP_SECRET: "",
      },
    },
    {
      command: `pnpm exec vp dev --port ${port}`,
      url: baseURL,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        VITE_API_URL: baseURL,
        VITE_API_ORIGIN: nestOrigin,
        VITE_E2E: "true",
      },
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
