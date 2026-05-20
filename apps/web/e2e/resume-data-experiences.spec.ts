import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";
import { openResumeDataRoute } from "./support/resume-data-navigation";

test.setTimeout(60_000);

test("creates, edits, and deletes an experience from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const created = {
    role: `E2E Route Engineer ${uniqueId}`,
    company: `Route Systems ${uniqueId}`,
    startDate: "2026-01",
    endDate: "Present",
    location: "Remote",
  };
  const updatedRole = `Senior E2E Route Engineer ${uniqueId}`;
  const updatedBullet = `Verified standalone experience CRUD ${uniqueId}`;

  await openResumeDataRoute(page, "/experiences", "experience-list-page");

  await page.getByRole("button", { name: "Add", exact: true }).click();
  await fillExperienceDialog(page, created);
  await page.getByRole("button", { name: "Create" }).click();

  await expectToast(page, "Experience created");
  await expect(experienceCard(page, created.role, created.company)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("experience-list-page")).toBeVisible();
  await expect(experienceCard(page, created.role, created.company)).toBeVisible();

  const createdCard = experienceCard(page, created.role, created.company);
  await createdCard.getByTestId("experience-edit-btn").click();
  await fillExperienceDialog(page, { ...created, role: updatedRole });
  await page.getByRole("button", { name: "Add bullet" }).click();
  await page.locator('[role="dialog"] form input').nth(6).fill(updatedBullet);
  await page.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Experience saved");
  await expect(experienceCard(page, updatedRole, created.company)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("experience-list-page")).toBeVisible();
  const updatedCard = experienceCard(page, updatedRole, created.company);
  await expect(updatedCard).toBeVisible();

  await updatedCard.getByTestId("experience-delete-btn").click();
  await expectToast(page, "Experience deleted");
  await expect(updatedCard).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("experience-list-page")).toBeVisible();
  await expect(experienceCard(page, updatedRole, created.company)).toBeHidden();
});

async function fillExperienceDialog(
  page: Page,
  values: {
    role: string;
    company: string;
    startDate: string;
    endDate: string;
    location: string;
  },
) {
  const inputs = page.locator('[role="dialog"] form input');
  await inputs.nth(0).fill(values.role);
  await inputs.nth(1).fill(values.company);
  await inputs.nth(2).fill(values.startDate);
  await inputs.nth(3).fill(values.endDate);
  await inputs.nth(4).fill(values.location);
}

function experienceCard(page: Page, role: string, company: string): Locator {
  return page.locator("[data-test^='experience-card-']").filter({ hasText: role }).filter({
    hasText: company,
  });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
