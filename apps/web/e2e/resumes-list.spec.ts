import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  expectToast,
  reloadAfterLocalWrites,
  ROW_SELECTOR,
  waitForLocalDb,
  waitForLocalWrites,
} from "./resume-data/local-db";
import { signUp } from "./support/auth";
import { createAndOpenResume } from "./support/resume-workflow";

test("manages resumes from the list route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const name = `List Resume ${uniqueId}`;
  const copyName = `${name} (copy)`;

  await createAndOpenResume(page, name);

  await openResumeList(page);
  const original = resumeCard(page, name);
  await expect(original).toBeVisible();

  await original.getByTestId("row-clone-btn").click();
  await expectToast(page, "Résumé cloned");
  await expect(page.getByTestId("resume-workbench")).toBeVisible();
  await expect(page.getByTestId("metadata-form").getByLabel("Resume Name")).toHaveValue(copyName);

  await openResumeList(page);
  await expect(original).toBeVisible();
  const clone = resumeCard(page, copyName);
  await expect(clone).toBeVisible();

  await clone.getByTestId("row-delete-btn").click();
  await expectToast(page, "Résumé deleted");
  await expect(clone).toBeHidden();

  await reloadAfterLocalWrites(page);
  await expect(page.getByTestId("resumes-list-page")).toBeVisible();
  await expect(original).toBeVisible();
  await expect(resumeCard(page, copyName)).toBeHidden();
});

async function openResumeList(page: Page) {
  await waitForLocalWrites(page);
  await page.goto("/resumes");
  await waitForLocalDb(page);
  await expect(page.getByTestId("resumes-list-page")).toBeVisible();
}

function resumeCard(page: Page, name: string): Locator {
  const title = page.locator("[data-slot='card-title']").and(page.getByText(name, { exact: true }));
  return page.getByTestId("resumes-table").locator(ROW_SELECTOR).filter({ has: title });
}
