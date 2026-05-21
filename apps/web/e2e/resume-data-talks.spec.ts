import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";
import { openResumeDataRoute } from "./support/resume-data-navigation";

test.setTimeout(60_000);

test("creates, edits, and deletes a talk from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const created = {
    title: `E2E Talk ${uniqueId}`,
    event: `Route Conf ${uniqueId}`,
    date: "2026-05",
    description: `Standalone talk CRUD ${uniqueId}`,
  };
  const updated = {
    title: `E2E Talk Updated ${uniqueId}`,
    event: `Route Conf Updated ${uniqueId}`,
    date: "2026-06",
    description: `Updated standalone talk CRUD ${uniqueId}`,
  };

  await openResumeDataRoute(page, "/talks", "talk-list-page");

  await page.getByRole("button", { name: "Add", exact: true }).click();
  await fillTalkDialog(page, created);
  await page.getByRole("button", { name: "Create" }).click();

  await expectToast(page, "Talk created");
  await expect(talkCard(page, created.title, created.event)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("talk-list-page")).toBeVisible();
  await expect(talkCard(page, created.title, created.event)).toBeVisible();

  const createdCard = talkCard(page, created.title, created.event);
  await createdCard.getByTestId("talk-edit-btn").click();
  await fillTalkDialog(page, updated);
  await page.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Talk saved");
  await expect(talkCard(page, updated.title, updated.event)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("talk-list-page")).toBeVisible();
  const updatedCard = talkCard(page, updated.title, updated.event);
  await expect(updatedCard).toBeVisible();
  await expect(updatedCard.getByText(updated.description)).toBeVisible();

  await updatedCard.getByTestId("talk-delete-btn").click();
  await expectToast(page, "Talk deleted");
  await expect(updatedCard).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("talk-list-page")).toBeVisible();
  await expect(talkCard(page, updated.title, updated.event)).toBeHidden();
});

async function fillTalkDialog(
  page: Page,
  values: {
    title: string;
    event: string;
    date: string;
    description: string;
  },
) {
  const dialog = page.locator('[role="dialog"]');
  const inputs = dialog.locator("input");
  await inputs.nth(0).fill(values.title);
  await inputs.nth(1).fill(values.event);
  await inputs.nth(2).fill(values.date);
  await dialog.locator("textarea").fill(values.description);
}

function talkCard(page: Page, title: string, event: string): Locator {
  return page.locator("[data-test^='talk-card-']").filter({ hasText: title }).filter({
    hasText: event,
  });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
