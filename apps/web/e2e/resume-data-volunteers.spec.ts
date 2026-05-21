import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";
import { openResumeDataRoute } from "./support/resume-data-navigation";

test.setTimeout(60_000);

test("creates, edits, and deletes a volunteer entry from the standalone route", async ({
  page,
}) => {
  const { uniqueId } = await signUp(page);
  const created = {
    organization: `E2E Volunteer Org ${uniqueId}`,
    role: `Mentor ${uniqueId}`,
    startDate: "2026-01",
    endDate: "2026-05",
    description: `Standalone volunteer CRUD ${uniqueId}`,
  };
  const updated = {
    organization: `E2E Volunteer Org Updated ${uniqueId}`,
    role: `Lead Mentor ${uniqueId}`,
    startDate: "2026-02",
    endDate: "2026-06",
    description: `Updated standalone volunteer CRUD ${uniqueId}`,
  };

  await openResumeDataRoute(page, "/volunteers", "volunteer-list-page");

  await page.getByRole("button", { name: "Add", exact: true }).click();
  await fillVolunteerDialog(page, created);
  await page.getByRole("button", { name: "Create" }).click();

  await expectToast(page, "Volunteer entry created");
  await expect(volunteerCard(page, created.organization, created.role)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("volunteer-list-page")).toBeVisible();
  await expect(volunteerCard(page, created.organization, created.role)).toBeVisible();

  const createdCard = volunteerCard(page, created.organization, created.role);
  await createdCard.getByTestId("volunteer-edit-btn").click();
  await fillVolunteerDialog(page, updated);
  await page.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Volunteer entry saved");
  await expect(volunteerCard(page, updated.organization, updated.role)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("volunteer-list-page")).toBeVisible();
  const updatedCard = volunteerCard(page, updated.organization, updated.role);
  await expect(updatedCard).toBeVisible();
  await expect(updatedCard.getByText(updated.description)).toBeVisible();

  await updatedCard.getByTestId("volunteer-delete-btn").click();
  await expectToast(page, "Volunteer entry deleted");
  await expect(updatedCard).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("volunteer-list-page")).toBeVisible();
  await expect(volunteerCard(page, updated.organization, updated.role)).toBeHidden();
});

async function fillVolunteerDialog(
  page: Page,
  values: {
    organization: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
  },
) {
  const dialog = page.locator('[role="dialog"]');
  const inputs = dialog.locator("input");
  await inputs.nth(0).fill(values.organization);
  await inputs.nth(1).fill(values.role);
  await inputs.nth(2).fill(values.startDate);
  await inputs.nth(3).fill(values.endDate);
  await dialog.locator("textarea").fill(values.description);
}

function volunteerCard(page: Page, organization: string, role: string): Locator {
  return page.locator("[data-test^='volunteer-card-']").filter({ hasText: organization }).filter({
    hasText: role,
  });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
