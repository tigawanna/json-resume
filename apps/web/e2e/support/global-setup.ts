import { chromium, selectors, type FullConfig } from "@playwright/test";
import { waitForLocalDb } from "../resume-data/local-db";
import { signUp } from "./auth";

const WARM_RESUME = "Warm-up résumé";

const WARM_ROUTES = [
  "/resumes",
  "/experiences",
  "/education",
  "/resume-projects",
  "/jobs",
  "/contacts",
  "/links",
  "/languages",
  "/certifications",
  "/skill-groups",
  "/summaries",
  "/talks",
  "/volunteers",
  "/repos",
  "/settings",
];

/** Routes the `@smoke` tests open; the résumé detail route is warmed below either way. */
const SMOKE_WARM_ROUTES = ["/resumes", "/experiences"];

/**
 * The dev server compiles each route on first request, which can take longer than an
 * `expect` timeout when every worker hits a cold route at once. Visit them once up front.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error("Playwright baseURL is not configured");

  selectors.setTestIdAttribute("data-test");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ baseURL });
    page.setDefaultTimeout(120_000);
    await signUp(page);
    const routes = process.env.E2E_SMOKE === "true" ? SMOKE_WARM_ROUTES : WARM_ROUTES;
    for (const route of routes) {
      await page.goto(route);
      await waitForLocalDb(page);
      await page.locator("[data-test$='-page']").first().waitFor();
    }

    await page.goto("/resumes");
    await waitForLocalDb(page);
    await page.getByTestId("add-resumes-btn").click();
    const dialog = page.getByRole("dialog", { name: "New Résumé" });
    await dialog.getByPlaceholder("e.g. Backend Engineer — Acme").fill(WARM_RESUME);
    await dialog.getByRole("button", { name: "Create" }).click();
    await page.getByTestId("resumes-table").getByText(WARM_RESUME, { exact: true }).first().click();
    await page.getByTestId("metadata-form").waitFor();
  } finally {
    await browser.close();
  }
}
