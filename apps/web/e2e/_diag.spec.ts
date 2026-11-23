import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import { waitForLocalDb, waitForLocalWrites } from "./resume-data/local-db";

test("diag autosave", async ({ page }) => {
  const logs: string[] = [];
  page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`[PAGEERROR] ${e.message}`));
  const { uniqueId } = await signUp(page);
  await waitForLocalWrites(page);
  await page.goto("/resumes");
  await waitForLocalDb(page);
  await page.getByTestId("add-resumes-btn").click();
  const dialog = page.getByRole("dialog", { name: "New Résumé" });
  await dialog.getByPlaceholder("e.g. Backend Engineer — Acme").fill(`Diag ${uniqueId}`);
  await dialog.getByRole("button", { name: "Create" }).click();
  await page
    .getByTestId("resumes-table")
    .getByText(`Diag ${uniqueId}`, { exact: true })
    .first()
    .click();
  await expect(page.getByTestId("resume-workbench")).toBeVisible();
  const metadata = page.getByTestId("metadata-form");
  await metadata.getByLabel("Headline").fill("Staff Platform Engineer");
  await page.waitForTimeout(5000);
  console.log("===== LOGS =====");
  for (const l of logs)
    if (l.includes("AUTOSAVE") || l.includes("PAGEERROR") || l.includes("Failed to load"))
      console.log(l);
  console.log("STATUS", await metadata.getByTestId("autosave-status").textContent());
});
