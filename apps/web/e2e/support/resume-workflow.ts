import { expect, type Page } from "@playwright/test";
import { waitForLocalDb, waitForLocalWrites } from "../resume-data/local-db";

/** Creates a résumé from the `/resumes` list and opens it in the editor. */
export async function createAndOpenResume(page: Page, name: string) {
  await waitForLocalWrites(page);
  await page.goto("/resumes");
  await waitForLocalDb(page);
  await expect(page.getByTestId("resumes-list-page")).toBeVisible();

  await page.getByTestId("add-resumes-btn").click();
  const dialog = page.getByRole("dialog", { name: "New Résumé" });
  await dialog.getByPlaceholder("e.g. Backend Engineer — Acme").fill(name);
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toBeHidden();

  await page.getByTestId("resumes-table").getByText(name, { exact: true }).first().click();
  await expect(page.getByTestId("resume-workbench")).toBeVisible();
  await expect(page.getByTestId("metadata-form")).toBeVisible();
  await expect(page).toHaveURL((url) => {
    return /^\/resumes\/[^/]+\/?$/.test(url.pathname) && url.searchParams.get("tab") === "edit";
  });
}
