import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";
import { openResumeDataRoute } from "./support/resume-data-navigation";

test.setTimeout(60_000);

test("creates, edits, and deletes a contact from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const created = {
    type: "email",
    value: `route-contact-${uniqueId}@example.com`,
    label: `Primary ${uniqueId}`,
  };
  const updated = {
    type: "website",
    value: `https://example.com/contact-${uniqueId}`,
    label: `Portfolio ${uniqueId}`,
  };

  await openResumeDataRoute(page, "/contacts", "contact-list-page");

  await page.getByRole("button", { name: "Add", exact: true }).click();
  await fillContactDialog(page, created);
  await page.getByRole("button", { name: "Create" }).click();

  await expectToast(page, "Contact created");
  await expect(contactCard(page, created.value, created.label)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("contact-list-page")).toBeVisible();
  await expect(contactCard(page, created.value, created.label)).toBeVisible();

  const createdCard = contactCard(page, created.value, created.label);
  await createdCard.getByTestId("contact-edit-btn").click();
  await fillContactDialog(page, updated);
  await page.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Contact saved");
  await expect(contactCard(page, updated.value, updated.label)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("contact-list-page")).toBeVisible();
  const updatedCard = contactCard(page, updated.value, updated.label);
  await expect(updatedCard).toBeVisible();

  await updatedCard.getByTestId("contact-delete-btn").click();
  await expectToast(page, "Contact deleted");
  await expect(updatedCard).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("contact-list-page")).toBeVisible();
  await expect(contactCard(page, updated.value, updated.label)).toBeHidden();
});

async function fillContactDialog(
  page: Page,
  values: {
    type: string;
    value: string;
    label: string;
  },
) {
  const dialog = page.locator('[role="dialog"]');
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: values.type, exact: true }).click();

  const inputs = dialog.locator('input[data-slot="input"]');
  await inputs.nth(0).fill(values.value);
  await inputs.nth(1).fill(values.label);
}

function contactCard(page: Page, value: string, label: string): Locator {
  return page.locator("[data-test^='contact-card-']").filter({ hasText: value }).filter({
    hasText: label,
  });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
