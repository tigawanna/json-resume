import { expect, type Page } from "@playwright/test";

export async function openResumeDataRoute(page: Page, path: string, pageTestId: string) {
  await page.goto(path);
  await expect(page.getByTestId(pageTestId)).toBeVisible();
}
