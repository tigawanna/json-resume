import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";
import { openResumeDataRoute } from "./support/resume-data-navigation";

test.setTimeout(60_000);

test("creates, edits, and deletes a summary from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const createdText = `E2E summary ${uniqueId} covering route-level CRUD.`;
  const updatedText = `Updated E2E summary ${uniqueId} persisted through the standalone route.`;

  await openResumeDataRoute(page, "/summaries", "summary-list-page");

  await page.getByRole("button", { name: "Add", exact: true }).click();
  await fillSummaryDialog(page, createdText);
  await page.getByRole("button", { name: "Create" }).click();

  await expectToast(page, "Summary created");
  await expect(summaryCard(page, createdText)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("summary-list-page")).toBeVisible();
  await expect(summaryCard(page, createdText)).toBeVisible();

  const createdCard = summaryCard(page, createdText);
  await createdCard.getByTestId("summary-edit-btn").click();
  await fillSummaryDialog(page, updatedText);
  await page.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Summary saved");
  await expect(summaryCard(page, updatedText)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("summary-list-page")).toBeVisible();
  const updatedCard = summaryCard(page, updatedText);
  await expect(updatedCard).toBeVisible();

  await updatedCard.getByTestId("summary-delete-btn").click();
  await expectToast(page, "Summary deleted");
  await expect(updatedCard).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("summary-list-page")).toBeVisible();
  await expect(summaryCard(page, updatedText)).toBeHidden();
});

async function fillSummaryDialog(page: Page, text: string) {
  await page.locator('[role="dialog"] textarea').fill(text);
}

function summaryCard(page: Page, text: string): Locator {
  return page.locator("[data-test^='summary-card-']").filter({ hasText: text });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
