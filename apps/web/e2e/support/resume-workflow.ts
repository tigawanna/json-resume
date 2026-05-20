import { expect, type Page } from "@playwright/test";

export async function createResumeFromDashboard(page: Page) {
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-page")).toBeVisible();

  await page.getByTestId("dashboard-primary-action").click();
  await expect(page.getByTestId("resume-list-page")).toBeVisible();

  await page.getByRole("button", { name: "New Resume" }).click();
  await expect(page.getByTestId("resume-workbench")).toBeVisible();
  await expect(page).toHaveURL((url) => {
    return /^\/resumes\/[^/]+\/?$/.test(url.pathname) && url.searchParams.get("tab") === "edit";
  });
}
