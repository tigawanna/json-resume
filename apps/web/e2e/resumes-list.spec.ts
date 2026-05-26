import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";

test.setTimeout(75_000);

test("manages resumes from the list route", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await signUp(page);

  await page.goto("/resumes");
  await expect(page.getByTestId("resume-list-page")).toBeVisible();
  await page.getByRole("button", { name: "New Resume" }).click();
  await expectToast(page, "Resume created");
  await expect(page.getByTestId("resume-workbench")).toBeVisible();

  await page.goto("/resumes");
  await expect(page.getByTestId("resume-list-page")).toBeVisible();
  const originalCard = resumeCard(page, "Untitled Resume");
  await expect(originalCard).toBeVisible();

  await originalCard.getByRole("link", { name: "Untitled Resume" }).first().click();
  await expect(page.getByTestId("resume-workbench")).toBeVisible();
  await expect(page).toHaveURL((url) => {
    return /^\/resumes\/[^/]+\/?$/.test(url.pathname) && url.searchParams.get("tab") === "edit";
  });

  await page.goto("/resumes");
  await expect(page.getByTestId("resume-list-page")).toBeVisible();
  await openResumeActions(originalCard);
  await page.getByTestId("resume-copy-json-btn").click();
  await expectToast(page, "Resume JSON copied");
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(clipboardText)).toMatchObject({
    version: 1,
    header: { fullName: "Jordan Lee" },
  });

  await openResumeActions(originalCard);
  await page.getByTestId("resume-clone-btn").click();
  await expectToast(page, "Resume cloned");
  await expect(page.getByTestId("resume-workbench")).toBeVisible();

  await page.goto("/resumes");
  await expect(page.getByTestId("resume-list-page")).toBeVisible();
  await expect(originalCard).toBeVisible();
  const clonedCard = resumeCard(page, "Untitled Resume (copy)");
  await expect(clonedCard).toBeVisible();

  await openResumeActions(clonedCard);
  await page.getByTestId("resume-delete-btn").click();
  await expectToast(page, "Resume deleted");
  await expect(clonedCard).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("resume-list-page")).toBeVisible();
  await expect(originalCard).toBeVisible();
  await expect(resumeCard(page, "Untitled Resume (copy)")).toBeHidden();
});

function resumeCard(page: Page, name: string): Locator {
  return page.locator("[data-test^='resume-card-']").filter({
    has: page.getByRole("link", { name, exact: true }),
  });
}

async function openResumeActions(card: Locator) {
  await card.getByTestId("resume-card-actions-trigger").click();
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
