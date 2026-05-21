import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";
import { openResumeDataRoute } from "./support/resume-data-navigation";

test.setTimeout(60_000);

test("creates, edits, and deletes a project from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const created = {
    name: `E2E Resume Project ${uniqueId}`,
    description: `Standalone project CRUD ${uniqueId}`,
    url: `https://github.com/example/resume-project-${uniqueId}`,
    homepageUrl: `https://example.com/resume-project-${uniqueId}`,
  };
  const updatedName = `E2E Resume Project Updated ${uniqueId}`;
  const updatedDescription = `Standalone project CRUD updated ${uniqueId}`;
  const techTag = `Playwright-${uniqueId}`;

  await openResumeDataRoute(page, "/resume-projects", "resume-project-list-page");

  await page.getByRole("button", { name: "Add", exact: true }).click();
  await fillProjectDialog(page, created);
  await page.getByRole("button", { name: "Create" }).click();

  await expectToast(page, "Project created");
  await expect(projectCard(page, created.name, created.description)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("resume-project-list-page")).toBeVisible();
  await expect(projectCard(page, created.name, created.description)).toBeVisible();

  const createdCard = projectCard(page, created.name, created.description);
  await createdCard.getByTestId("project-edit-btn").click();
  await fillProjectDialog(page, {
    ...created,
    name: updatedName,
    description: updatedDescription,
  });
  await page.locator('[role="dialog"] form input').nth(3).fill(techTag);
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Project saved");
  await expect(projectCard(page, updatedName, updatedDescription)).toBeVisible();
  await expect(projectCard(page, updatedName, updatedDescription).getByText(techTag)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("resume-project-list-page")).toBeVisible();
  const updatedCard = projectCard(page, updatedName, updatedDescription);
  await expect(updatedCard).toBeVisible();
  await expect(updatedCard.getByText(techTag)).toBeVisible();

  await updatedCard.getByTestId("project-delete-btn").click();
  await expectToast(page, "Project deleted");
  await expect(updatedCard).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("resume-project-list-page")).toBeVisible();
  await expect(projectCard(page, updatedName, updatedDescription)).toBeHidden();
});

async function fillProjectDialog(
  page: Page,
  values: {
    name: string;
    description: string;
    url: string;
    homepageUrl: string;
  },
) {
  const dialog = page.locator('[role="dialog"]');
  await dialog.locator("input").nth(0).fill(values.name);
  await dialog.locator("textarea").fill(values.description);
  await dialog.locator("input").nth(1).fill(values.url);
  await dialog.locator("input").nth(2).fill(values.homepageUrl);
}

function projectCard(page: Page, name: string, description: string): Locator {
  return page.locator("[data-test^='project-card-']").filter({ hasText: name }).filter({
    hasText: description,
  });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
