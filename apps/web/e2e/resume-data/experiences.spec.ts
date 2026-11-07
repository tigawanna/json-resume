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
    const row = page
      .getByTestId("experiences-table")
      .locator(ROW_SELECTOR)
      .filter({ hasText: createdRole });
    await expect(row).toHaveCount(1);
    await row.getByTestId("experience-detail-link").click();
    await expect(page).toHaveURL(/\/experiences\/[^/]+/);
    await expect(page.getByTestId("experience-detail-page")).toBeVisible();
    const detail = page.getByTestId("experience-detail-page");
    const titleInput = detail.getByTestId("experience-title");
    await expect(titleInput).toHaveValue(createdRole);
    await titleInput.fill(`${createdRole} Senior`);
    await detail.getByTestId("experience-save").click();
    await expectToast(page, "Experience saved");
    await page.getByTestId("experience-detail-back").click();
    await expect(page).toHaveURL(/\/experiences(\/?|\?|$)/);
    // Back returns to the unfiltered list, so restore the search the delete below relies on.
    await searchList(page, createdRole);
    await expectDesktopRowCount(page, "experiences-table", 1);
    await expect(page.getByTestId("experiences-table")).toContainText(`${createdRole} Senior`);

    await clickTableRowAction(page, "experiences-table", "delete", `${createdRole} Senior`);
    await expectToast(page, "Experience deleted");
    await expect(page.getByTestId("experiences-empty")).toBeVisible();
  },
);

test("edits bullets inside an expandable experience card", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const prefix = `Exp${uniqueId.slice(0, 8)}`;

  await openSeededList(page, "/experiences", "experiences-list-page");
  await seedCollection(page, "resumeExperience", experienceSeedRows(prefix, 1));

  await searchList(page, `${prefix} Needle Role`);
  await expectDesktopRowCount(page, "experiences-table", 1);

  const row = page
    .getByTestId("experiences-table")
    .locator(ROW_SELECTOR)
    .filter({ hasText: `${prefix} Needle Role` });
  await expect(row).toHaveCount(1);
  await row.getByTestId("experience-detail-link").click();
  await expect(page).toHaveURL(/\/experiences\/[^/]+/);
  await expect(page.getByTestId("experience-detail-page")).toBeVisible();
  const detail = page.getByTestId("experience-detail-page");
  await expect(detail.getByTestId("experience-bullets")).toBeVisible();

  await detail.getByTestId("experience-add-bullet").click();
  await detail.getByTestId("experience-bullet").nth(0).fill("Shipped a payments migration");
  await detail.getByTestId("experience-save-bullets").click();
  await expectToast(page, "Bullets saved");
  await expect(detail.getByTestId("experience-bullets")).toContainText(
    "Shipped a payments migration",
  );
});

test("groups titles by company and period with all bullets visible to prune", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const prefix = `Exp${uniqueId.slice(0, 8)}`;
  const company = `${prefix} Group Co`;
  const now = 1_700_000_000_000;

  await openSeededList(page, "/experiences", "experiences-list-page");
  await seedCollection(page, "resumeExperience", [
    {
      id: `${prefix}-group-000`,
      company,
      role: `${prefix} Mobile Dev`,
      startDate: "2022-01",
      endDate: "2024-12",
      location: "Remote",
      sortOrder: 0,
      userId: null,
      searchableText: `${company} ${prefix} Mobile Dev 2022-01 2024-12`,
      embedding: null,
      embeddingModel: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${prefix}-group-001`,
      company,
      role: `${prefix} Mobile Fullstack`,
      startDate: "2022-01",
      endDate: "2024-12",
      location: "Remote",
      sortOrder: 1,
      userId: null,
      searchableText: `${company} ${prefix} Mobile Fullstack 2022-01 2024-12`,
      embedding: null,
      embeddingModel: null,
      createdAt: now + 1,
      updatedAt: now + 1,
    },
  ]);

  await searchList(page, company);
  await expectDesktopRowCount(page, "experiences-table", 1);

  const group = page
    .getByTestId("experiences-table")
    .locator(ROW_SELECTOR)
    .filter({ hasText: company });
  await expect(group).toHaveCount(1);
  await expect(group).toContainText("2 titles");
  await group.getByTestId("experience-detail-link").click();
  await expect(page).toHaveURL(/\/experiences\/[^/]+/);
  await expect(page.getByTestId("experience-detail-page")).toBeVisible();
  const detail = page.getByTestId("experience-detail-page");

  await expect(detail.getByTestId("experience-title").nth(0)).toBeVisible();
  await expect(detail.getByTestId("experience-title").nth(1)).toBeVisible();
  await expect(detail.getByTestId("experience-bullets")).toHaveCount(2);

  const firstBullets = detail.getByTestId("experience-bullets").nth(0);
  await firstBullets.getByTestId("experience-add-bullet").click();
  await firstBullets.getByTestId("experience-bullet").nth(0).fill("Maestro");
  await firstBullets.getByTestId("experience-save-bullets").click();
  await expectToast(page, "Bullets saved");

  const secondBullets = detail.getByTestId("experience-bullets").nth(1);
  await secondBullets.getByTestId("experience-add-bullet").click();
  await secondBullets.getByTestId("experience-bullet").nth(0).fill("Vitest");
  await secondBullets.getByTestId("experience-save-bullets").click();
  await expectToast(page, "Bullets saved");

  // Merge in the unified view: upgrade Vitest half to Maestro + Vitest and prune via delete on the Maestro half's duplicate.
  const merged = secondBullets.getByTestId("experience-bullet").nth(0);
  await merged.fill("Maestro + Vitest");
  await secondBullets.getByTestId("experience-save-bullets").click();
  await expectToast(page, "Bullets saved");
  await expect(secondBullets).toContainText("Maestro + Vitest");

  // Unique bullets view: one row per bullet id, whichever title owns it.
  await detail.getByTestId("experience-view-unique").click();
  const unique = detail.getByTestId("experience-unique-bullets");
  await expect(unique).toBeVisible();
  await expect(unique.getByTestId("experience-unique-bullet")).toHaveCount(2);
  await expect(unique).toContainText("Maestro");
  await expect(unique).toContainText("Maestro + Vitest");
  await detail.getByTestId("experience-view-titles").click();
  await expect(detail.getByTestId("experience-bullets")).toHaveCount(2);

  // Docs-style sparkle entry: expands into the composer (setup state without a key).
  await expect(detail.getByTestId("experience-ai-panel")).toHaveCount(0);
  await detail.getByTestId("experience-ai-open").click();
  const aiPanel = detail.getByTestId("experience-ai-panel");
  await expect(aiPanel).toBeVisible();
  await expect(aiPanel.getByTestId("experience-ai-setup")).toBeVisible();
  await aiPanel.getByTestId("experience-ai-close").click();
  await expect(aiPanel).toHaveCount(0);
  await expect(detail.getByTestId("experience-ai-open")).toBeVisible();
});
