import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";
import { openResumeDataRoute } from "./support/resume-data-navigation";

test.setTimeout(60_000);

test("creates, edits, and deletes a certification from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const created = {
    name: `E2E Certification ${uniqueId}`,
    issuer: `Route Academy ${uniqueId}`,
    date: "2026-05",
    url: `https://example.com/cert-${uniqueId}`,
  };
  const updated = {
    name: `E2E Certification Updated ${uniqueId}`,
    issuer: `Route Academy Updated ${uniqueId}`,
    date: "2026-06",
    url: `https://example.com/cert-updated-${uniqueId}`,
  };

  await openResumeDataRoute(page, "/certifications", "certification-list-page");

  await page.getByRole("button", { name: "Add", exact: true }).click();
  await fillCertificationDialog(page, created);
  await page.getByRole("button", { name: "Create" }).click();

  await expectToast(page, "Certification created");
  await expect(certificationCard(page, created.name, created.issuer)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("certification-list-page")).toBeVisible();
  await expect(certificationCard(page, created.name, created.issuer)).toBeVisible();

  const createdCard = certificationCard(page, created.name, created.issuer);
  await createdCard.getByTestId("certification-edit-btn").click();
  await fillCertificationDialog(page, updated);
  await page.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Certification saved");
  await expect(certificationCard(page, updated.name, updated.issuer)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("certification-list-page")).toBeVisible();
  const updatedCard = certificationCard(page, updated.name, updated.issuer);
  await expect(updatedCard).toBeVisible();
  await expect(updatedCard.getByText(updated.date)).toBeVisible();

  await updatedCard.getByTestId("certification-delete-btn").click();
  await expectToast(page, "Certification deleted");
  await expect(updatedCard).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("certification-list-page")).toBeVisible();
  await expect(certificationCard(page, updated.name, updated.issuer)).toBeHidden();
});

async function fillCertificationDialog(
  page: Page,
  values: {
    name: string;
    issuer: string;
    date: string;
    url: string;
  },
) {
  const inputs = page.locator('[role="dialog"] form input');
  await inputs.nth(0).fill(values.name);
  await inputs.nth(1).fill(values.issuer);
  await inputs.nth(2).fill(values.date);
  await inputs.nth(3).fill(values.url);
}

function certificationCard(page: Page, name: string, issuer: string): Locator {
  return page.locator("[data-test^='certification-card-']").filter({ hasText: name }).filter({
    hasText: issuer,
  });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
