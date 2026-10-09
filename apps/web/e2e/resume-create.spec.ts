import { expect, test } from "@playwright/test";
import { waitForLocalDb, waitForLocalWrites } from "./resume-data/local-db";
import { signUp } from "./support/auth";
import { createAndOpenResume } from "./support/resume-workflow";

test("creates a resume through the authenticated UI", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const name = `Created Resume ${uniqueId}`;
  await createAndOpenResume(page, name);

  await waitForLocalWrites(page);
  await page.goto("/resumes");
  await waitForLocalDb(page);
  await expect(
    page
      .getByTestId("resumes-table")
      .locator("[data-slot='card-title']")
      .and(page.getByText(name, { exact: true })),
  ).toBeVisible();
});
