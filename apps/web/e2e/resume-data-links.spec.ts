import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";
import { openResumeDataRoute } from "./support/resume-data-navigation";

test.setTimeout(60_000);

test("creates, edits, and deletes a link from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const created = {
    label: `E2E Link ${uniqueId}`,
    url: `https://example.com/link-${uniqueId}`,
    icon: "globe",
  };
  const updated = {
    label: `E2E Link Updated ${uniqueId}`,
    url: `https://example.com/link-updated-${uniqueId}`,
    icon: "github",
  };

  await openResumeDataRoute(page, "/links", "link-list-page");

  await page.getByRole("button", { name: "Add", exact: true }).click();
  await fillLinkDialog(page, created);
  await page.getByRole("button", { name: "Create" }).click();

  await expectToast(page, "Link created");
  await expect(linkCard(page, created.label, created.url)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("link-list-page")).toBeVisible();
  await expect(linkCard(page, created.label, created.url)).toBeVisible();

  const createdCard = linkCard(page, created.label, created.url);
  await createdCard.getByTestId("link-edit-btn").click();
  await fillLinkDialog(page, updated);
  await page.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Link saved");
  await expect(linkCard(page, updated.label, updated.url)).toBeVisible();
  await expect(
    linkCard(page, updated.label, updated.url).getByText(`Icon: ${updated.icon}`),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("link-list-page")).toBeVisible();
  const updatedCard = linkCard(page, updated.label, updated.url);
  await expect(updatedCard).toBeVisible();
  await expect(updatedCard.getByText(`Icon: ${updated.icon}`)).toBeVisible();

  await updatedCard.getByTestId("link-delete-btn").click();
  await expectToast(page, "Link deleted");
  await expect(updatedCard).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("link-list-page")).toBeVisible();
  await expect(linkCard(page, updated.label, updated.url)).toBeHidden();
});

async function fillLinkDialog(
  page: Page,
  values: {
    label: string;
    url: string;
    icon: string;
  },
) {
  const inputs = page.locator('[role="dialog"] form input');
  await inputs.nth(0).fill(values.label);
  await inputs.nth(1).fill(values.url);
  await inputs.nth(2).fill(values.icon);
}

function linkCard(page: Page, label: string, url: string): Locator {
  return page.locator("[data-test^='link-card-']").filter({ hasText: label }).filter({
    hasText: url,
  });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
