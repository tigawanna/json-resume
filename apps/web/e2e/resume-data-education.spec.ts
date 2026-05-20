import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";
import { openResumeDataRoute } from "./support/resume-data-navigation";

test.setTimeout(60_000);

test("creates, edits, and deletes education from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const created = {
    school: `E2E Institute ${uniqueId}`,
    degree: "Certificate",
    field: `Route Testing ${uniqueId}`,
    startDate: "2025",
    endDate: "2026",
  };
  const updatedSchool = `E2E Institute Updated ${uniqueId}`;

  await openResumeDataRoute(page, "/education", "education-list-page");

  await page.getByRole("button", { name: "Add", exact: true }).click();
  await fillEducationDialog(page, created);
  await page.getByRole("button", { name: "Create" }).click();

  await expectToast(page, "Education created");
  await expect(educationCard(page, created.school, created.field)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("education-list-page")).toBeVisible();
  await expect(educationCard(page, created.school, created.field)).toBeVisible();

  const createdCard = educationCard(page, created.school, created.field);
  await createdCard.getByTestId("education-edit-btn").click();
  await fillEducationDialog(page, { ...created, school: updatedSchool });
  await page.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Education saved");
  await expect(educationCard(page, updatedSchool, created.field)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("education-list-page")).toBeVisible();
  const updatedCard = educationCard(page, updatedSchool, created.field);
  await expect(updatedCard).toBeVisible();

  await updatedCard.getByTestId("education-delete-btn").click();
  await expectToast(page, "Education deleted");
  await expect(updatedCard).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("education-list-page")).toBeVisible();
  await expect(educationCard(page, updatedSchool, created.field)).toBeHidden();
});

async function fillEducationDialog(
  page: Page,
  values: {
    school: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
  },
) {
  const inputs = page.locator('[role="dialog"] form input');
  const inputCount = await inputs.count();
  const fieldIndex = inputCount > 5 ? 3 : 2;
  const startDateIndex = inputCount > 5 ? 4 : 3;
  const endDateIndex = inputCount > 5 ? 5 : 4;

  await inputs.nth(0).fill(values.school);
  await inputs.nth(1).fill(values.degree);
  await inputs.nth(fieldIndex).fill(values.field);
  await inputs.nth(startDateIndex).fill(values.startDate);
  await inputs.nth(endDateIndex).fill(values.endDate);
}

function educationCard(page: Page, school: string, field: string): Locator {
  return page.locator("[data-test^='education-card-']").filter({ hasText: school }).filter({
    hasText: field,
  });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
