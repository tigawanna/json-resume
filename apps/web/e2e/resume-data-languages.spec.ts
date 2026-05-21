import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";
import { openResumeDataRoute } from "./support/resume-data-navigation";

test.setTimeout(60_000);

test("creates, edits, and deletes a language from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const created = {
    name: `E2E Language ${uniqueId}`,
    proficiency: "Professional",
  };
  const updated = {
    name: `E2E Language Updated ${uniqueId}`,
    proficiency: "Fluent",
  };

  await openResumeDataRoute(page, "/languages", "language-list-page");

  await page.getByRole("button", { name: "Add", exact: true }).click();
  await fillLanguageDialog(page, created);
  await page.getByRole("button", { name: "Create" }).click();

  await expectToast(page, "Language created");
  await expect(languageCard(page, created.name, created.proficiency)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("language-list-page")).toBeVisible();
  await expect(languageCard(page, created.name, created.proficiency)).toBeVisible();

  const createdCard = languageCard(page, created.name, created.proficiency);
  await createdCard.getByTestId("language-edit-btn").click();
  await fillLanguageDialog(page, updated);
  await page.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Language saved");
  await expect(languageCard(page, updated.name, updated.proficiency)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("language-list-page")).toBeVisible();
  const updatedCard = languageCard(page, updated.name, updated.proficiency);
  await expect(updatedCard).toBeVisible();

  await updatedCard.getByTestId("language-delete-btn").click();
  await expectToast(page, "Language deleted");
  await expect(updatedCard).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("language-list-page")).toBeVisible();
  await expect(languageCard(page, updated.name, updated.proficiency)).toBeHidden();
});

async function fillLanguageDialog(
  page: Page,
  values: {
    name: string;
    proficiency: string;
  },
) {
  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('input[data-slot="input"]').fill(values.name);
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: values.proficiency, exact: true }).click();
}

function languageCard(page: Page, name: string, proficiency: string): Locator {
  return page.locator("[data-test^='language-card-']").filter({ hasText: name }).filter({
    hasText: proficiency,
  });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
