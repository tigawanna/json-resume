import { expect, test } from "@playwright/test";
import { signUp } from "../support/auth";
import {
  clickTableRowAction,
  expectDesktopRowCount,
  expectPagination,
  expectToast,
  goToNextPage,
  jobSeedRows,
  LIBRARY_SEED_COUNT,
  openSeededList,
  PAGE_SIZE,
  searchList,
  seedCollection,
  submitDialog,
} from "./local-db";

test("paginates, searches, and CRUDs local jobs", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const prefix = `Job${uniqueId.slice(0, 8)}`;
  const totalPages = Math.ceil(LIBRARY_SEED_COUNT / PAGE_SIZE);

  await openSeededList(page, "/jobs", "jobs-list-page");
  await seedCollection(page, "job", jobSeedRows(prefix));

  await expectDesktopRowCount(page, "jobs-table", PAGE_SIZE);
  await expectPagination(page, 1, totalPages);
  await goToNextPage(page, 2);
  await expectPagination(page, 2, totalPages);

  await searchList(page, `${prefix} Needle Labs`);
  await expectDesktopRowCount(page, "jobs-table", 1);

  await page.getByTestId("add-jobs-btn").click();
  const company = `${prefix} Live Co`;
  const dialog = page.getByRole("dialog");
  await dialog.locator("input").nth(0).fill(company);
  await dialog.locator("input").nth(1).fill("Staff Engineer");
  await dialog.locator("textarea").first().fill("Own the frontend platform.");
  await dialog
    .getByRole("button", { name: "Save job" })
    .evaluate((el: HTMLButtonElement) => el.click());
  await expectToast(page, "Job saved");

  await searchList(page, company);
  await expectDesktopRowCount(page, "jobs-table", 1);
  await clickTableRowAction(page, "jobs-table", "edit", company);
  const editDialog = page.getByRole("dialog");
  await expect(editDialog.locator("input").nth(1)).toHaveValue("Staff Engineer");
  await editDialog.locator("input").nth(1).fill("Principal Engineer");
  await submitDialog(page, "Save");
  await expectToast(page, "Job saved");
  await expect(page.getByTestId("jobs-table")).toContainText("Principal Engineer");

  await clickTableRowAction(page, "jobs-table", "delete", company);
  await expectToast(page, "Job deleted");
});
