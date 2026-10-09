import { expect, test } from "@playwright/test";
import { signUp } from "../support/auth";
import {
  educationSeedRows,
  expectDesktopRowCount,
  expectPagination,
  expectToast,
  clickTableRowAction,
  goToNextPage,
  LIBRARY_SEED_COUNT,
  openSeededList,
  PAGE_SIZE,
  searchList,
  seedCollection,
  submitDialog,
} from "./local-db";

test("paginates, searches, and CRUDs local education entries", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const prefix = `Edu${uniqueId.slice(0, 8)}`;
  const totalPages = Math.ceil(LIBRARY_SEED_COUNT / PAGE_SIZE);

  await openSeededList(page, "/education", "education-list-page");
  await seedCollection(page, "resumeEducation", educationSeedRows(prefix));

  await expectDesktopRowCount(page, "education-table", PAGE_SIZE);
  await expectPagination(page, 1, totalPages);

  await goToNextPage(page, 2);
  await expectPagination(page, 2, totalPages);
  await expectDesktopRowCount(page, "education-table", PAGE_SIZE);

  await searchList(page, `${prefix} Needle University`);
  await expectDesktopRowCount(page, "education-table", 1);
  await expect(page.getByTestId("education-table")).toContainText(`${prefix} Needle University`);

  await page.getByTestId("add-education-btn").click();
  const school = `${prefix} Live School`;
  const dialog = page.getByRole("dialog");
  await dialog.locator("input").nth(0).fill(school);
  await dialog.locator("input").nth(1).fill("MSc");
  await dialog.locator("input").nth(2).fill("Design");
  await dialog
    .getByRole("button", { name: "Create" })
    .evaluate((el: HTMLButtonElement) => el.click());
  await expectToast(page, "Education created");

  await searchList(page, school);
  await expectDesktopRowCount(page, "education-table", 1);
  await clickTableRowAction(page, "education-table", "edit", school);
  const editDialog = page.getByRole("dialog");
  await expect(editDialog.locator("input").nth(1)).toHaveValue("MSc");
  await editDialog.locator("input").nth(1).fill("MFA");
  await submitDialog(page, "Save");
  await expectToast(page, "Education saved");
  await expect(page.getByTestId("education-table")).toContainText("MFA");

  await clickTableRowAction(page, "education-table", "delete", school);
  await expectToast(page, "Education deleted");
});
