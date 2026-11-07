import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import {
  expectToast,
  ROW_SELECTOR,
  waitForLocalDb,
  waitForLocalWrites,
} from "./resume-data/local-db";

test("creates, edits, and deletes an experience from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const role = `E2E Route Engineer ${uniqueId}`;
  const updatedRole = `Senior E2E Route Engineer ${uniqueId}`;

  await page.goto("/experiences");
  await waitForLocalDb(page);
  await expect(page.getByTestId("experiences-list-page")).toBeVisible();

  await page.getByTestId("add-experiences-btn").click();
  const createDialog = page.getByRole("dialog");
  const inputs = createDialog.locator("input");
  await inputs.nth(0).fill(role);
  await inputs.nth(1).fill(`Route Systems ${uniqueId}`);
  await inputs.nth(2).fill("2026-01");
  await inputs.nth(3).fill("Present");
  await inputs.nth(4).fill("Remote");
  await createDialog.getByRole("button", { name: "Create" }).click();
  await expectToast(page, "Experience created");
  await expect(createDialog).toBeHidden();

  function card(text: string) {
    return page.getByTestId("experiences-table").locator(ROW_SELECTOR).filter({ hasText: text });
  }

  await expect(card(role)).toBeVisible();

  await waitForLocalWrites(page);
  await page.reload();
  await waitForLocalDb(page);
  await expect(page.getByTestId("experiences-list-page")).toBeVisible();
  await expect(card(role)).toBeVisible();

  await card(role).getByTestId("experience-detail-link").click();
  await expect(page).toHaveURL(/\/experiences\/[^/]+/);
  await expect(page.getByTestId("experience-detail-page")).toBeVisible();
  const detail = page.getByTestId("experience-detail-page");
  const titleInput = detail.getByTestId("experience-title");
  await expect(titleInput).toHaveValue(role);
  await titleInput.fill(updatedRole);
  await detail.getByTestId("experience-save").click();
  await expectToast(page, "Experience saved");
  await page.getByTestId("experience-detail-back").click();
  await expect(page).toHaveURL(/\/experiences(\/?|\?|$)/);
  await expect(card(updatedRole)).toBeVisible();

  await waitForLocalWrites(page);
  await page.reload();
  await waitForLocalDb(page);
  await expect(page.getByTestId("experiences-list-page")).toBeVisible();
  await expect(card(updatedRole)).toBeVisible();

  await card(updatedRole).getByTestId("row-delete-btn").click();
  await expectToast(page, "Experience deleted");
  await expect(card(updatedRole)).toBeHidden();

  await waitForLocalWrites(page);
  await page.reload();
  await waitForLocalDb(page);
  await expect(page.getByTestId("experiences-list-page")).toBeVisible();
  await expect(card(updatedRole)).toBeHidden();
});
