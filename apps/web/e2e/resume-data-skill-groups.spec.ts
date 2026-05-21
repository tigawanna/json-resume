import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";
import { openResumeDataRoute } from "./support/resume-data-navigation";

test.setTimeout(60_000);

test("creates, edits, and deletes a skill group from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const createdName = `E2E Skill Group ${uniqueId}`;
  const updatedName = `E2E Skill Group Updated ${uniqueId}`;
  const createdSkill = `TypeScript-${uniqueId}`;
  const updatedSkill = `Playwright-${uniqueId}`;

  await openResumeDataRoute(page, "/skill-groups", "skill-group-list-page");

  await page.getByRole("button", { name: "Add", exact: true }).click();
  await fillSkillGroupDialog(page, createdName, createdSkill);
  await page.getByRole("button", { name: "Create" }).click();

  await expectToast(page, "Skill group created");
  await expect(skillGroupCard(page, createdName, createdSkill)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("skill-group-list-page")).toBeVisible();
  await expect(skillGroupCard(page, createdName, createdSkill)).toBeVisible();

  const createdCard = skillGroupCard(page, createdName, createdSkill);
  await createdCard.getByTestId("skill-group-edit-btn").click();
  await fillSkillGroupDialog(page, updatedName, updatedSkill);
  await page.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Skill group saved");
  await expect(skillGroupCard(page, updatedName, updatedSkill)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("skill-group-list-page")).toBeVisible();
  const updatedCard = skillGroupCard(page, updatedName, updatedSkill);
  await expect(updatedCard).toBeVisible();

  await updatedCard.getByTestId("skill-group-delete-btn").click();
  await expectToast(page, "Skill group deleted");
  await expect(updatedCard).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("skill-group-list-page")).toBeVisible();
  await expect(skillGroupCard(page, updatedName, updatedSkill)).toBeHidden();
});

async function fillSkillGroupDialog(page: Page, name: string, skill: string) {
  const dialog = page.locator('[role="dialog"]');
  await dialog.locator("input").nth(0).fill(name);
  await dialog.locator("input").nth(1).fill(skill);
  await page.keyboard.press("Enter");
}

function skillGroupCard(page: Page, name: string, skill: string): Locator {
  return page.locator("[data-test^='skill-group-card-']").filter({ hasText: name }).filter({
    hasText: skill,
  });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
