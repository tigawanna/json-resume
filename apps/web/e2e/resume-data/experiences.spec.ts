import { expect, test } from "@playwright/test";
import { signUp } from "../support/auth";
import {
  clickTableRowAction,
  expectDesktopRowCount,
  expectPagination,
  expectToast,
  experienceSeedRows,
  goToNextPage,
  LIBRARY_SEED_COUNT,
  openSeededList,
  PAGE_SIZE,
  ROW_SELECTOR,
  searchList,
  seedCollection,
} from "./local-db";

test(
  "paginates, searches, and CRUDs local experiences without overflowing",
  {
    tag: "@smoke",
  },
  async ({ page }) => {
    const { uniqueId } = await signUp(page);
    const prefix = `Exp${uniqueId.slice(0, 8)}`;
    const totalPages = Math.ceil(LIBRARY_SEED_COUNT / PAGE_SIZE);

    await openSeededList(page, "/experiences", "experiences-list-page");
    await seedCollection(page, "resumeExperience", experienceSeedRows(prefix));

    await expectDesktopRowCount(page, "experiences-table", PAGE_SIZE);
    await expectPagination(page, 1, totalPages);
    await expect(page.getByTestId("experiences-table").locator(ROW_SELECTOR).first()).toBeVisible();

    const firstPageText = await page.getByTestId("experiences-table").innerText();
    expect(firstPageText.length).toBeGreaterThan(40);

    await goToNextPage(page, 2);
    await expectPagination(page, 2, totalPages);
    await expectDesktopRowCount(page, "experiences-table", PAGE_SIZE);

    await goToNextPage(page, 3);
    await goToNextPage(page, 4);
    await goToNextPage(page, 5);
    await expectPagination(page, 5, totalPages);
    await expectDesktopRowCount(page, "experiences-table", PAGE_SIZE);
    await expect(page.getByTestId("pagination-next")).toBeDisabled();

    await searchList(page, `${prefix} Needle Role`);
    await expect(page.getByTestId("list-pagination")).toHaveCount(0);
    await expectDesktopRowCount(page, "experiences-table", 1);
    await expect(page.getByTestId("experiences-table")).toContainText(`${prefix} Needle Co`);

    await searchList(page, "");
    await expectPagination(page, 1, totalPages);

    await page.getByTestId("add-experiences-btn").click();
    const createdRole = `${prefix} Live Role`;
    const createdCompany = `${prefix} Live Co`;
    const dialog = page.getByRole("dialog");
    await dialog.locator("input").nth(0).fill(createdRole);
    await dialog.locator("input").nth(1).fill(createdCompany);
    await dialog.locator("input").nth(2).fill("2026-01");
    await dialog.locator("input").nth(3).fill("Present");
    await dialog.locator("input").nth(4).fill("Remote");
    await dialog.getByRole("button", { name: "Create" }).click();
    await expectToast(page, "Experience created");

    await searchList(page, createdRole);
    await expectDesktopRowCount(page, "experiences-table", 1);
    await clickTableRowAction(page, "experiences-table", "edit", createdRole);
    const editDialog = page.getByRole("dialog");
    await expect(editDialog.locator("input").nth(0)).toHaveValue(createdRole);
    await editDialog.locator("input").nth(0).fill(`${createdRole} Senior`);
    await editDialog.getByRole("button", { name: "Save" }).click();
    await expectToast(page, "Experience saved");
    await expect(page.getByTestId("experiences-table")).toContainText(`${createdRole} Senior`);

    await clickTableRowAction(page, "experiences-table", "delete", `${createdRole} Senior`);
    await expectToast(page, "Experience deleted");
    await expect(page.getByTestId("experiences-empty")).toBeVisible();
  },
);
