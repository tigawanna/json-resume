import { expect, test } from "@playwright/test";
import { signUp } from "../support/auth";
import {
  clickTableRowAction,
  expectDesktopRowCount,
  expectPagination,
  expectToast,
  goToNextPage,
  LIBRARY_SEED_COUNT,
  openSeededList,
  PAGE_SIZE,
  projectSeedRows,
  searchList,
  seedCollection,
  submitDialog,
} from "./local-db";

test("paginates, searches, and CRUDs local resume projects", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const prefix = `Prj${uniqueId.slice(0, 8)}`;
  const totalPages = Math.ceil(LIBRARY_SEED_COUNT / PAGE_SIZE);

  await openSeededList(page, "/resume-projects", "resume-projects-list-page");
  await seedCollection(page, "resumeProject", projectSeedRows(prefix));

  await expectDesktopRowCount(page, "resume-projects-table", PAGE_SIZE);
  await expectPagination(page, 1, totalPages);

  await goToNextPage(page, 2);
  await expectPagination(page, 2, totalPages);

  await searchList(page, `${prefix} Needle Project`);
  await expectDesktopRowCount(page, "resume-projects-table", 1);
  await expect(page.getByTestId("resume-projects-table")).toContainText(`${prefix} Needle Project`);

  await page.getByTestId("add-resume-projects-btn").click();
  const name = `${prefix} Live Project`;
  const dialog = page.getByRole("dialog");
  await dialog.locator("input").nth(0).fill(name);
  await dialog.locator("input").nth(1).fill("https://github.com/example/live");
  await dialog
    .getByRole("button", { name: "Create" })
    .evaluate((el: HTMLButtonElement) => el.click());
  await expectToast(page, "Project created");

  await searchList(page, name);
  await expectDesktopRowCount(page, "resume-projects-table", 1);
  await clickTableRowAction(page, "resume-projects-table", "edit", name);
  const editDialog = page.getByRole("dialog");
  await expect(editDialog.locator("input").nth(0)).toHaveValue(name);
  await editDialog.locator("input").nth(0).fill(`${name} v2`);
  await submitDialog(page, "Save");
  await expectToast(page, "Project saved");
  await expect(page.getByTestId("resume-projects-table")).toContainText(`${name} v2`);

  await clickTableRowAction(page, "resume-projects-table", "delete", `${name} v2`);
  await expectToast(page, "Project deleted");
});
