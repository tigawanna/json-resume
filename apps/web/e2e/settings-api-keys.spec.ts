import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";

test.setTimeout(60_000);

test("creates, copies, and deletes an API key from settings", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const { uniqueId } = await signUp(page);
  const keyName = `E2E API Key ${uniqueId}`;

  await page.goto("/settings");
  await expect(page.getByTestId("settings-page")).toBeVisible();
  await expect(page.getByTestId("api-keys-empty")).toBeVisible();

  await page.getByTestId("create-api-key-btn").click();
  await expect(page.getByTestId("create-api-key-dialog")).toBeVisible();
  await page.getByTestId("api-key-name-input").fill(keyName);
  await page.getByTestId("create-api-key-submit").click();

  await expect(page.getByTestId("new-key-reveal-dialog")).toBeVisible();
  const revealedKey = await page.getByTestId("new-key-value").inputValue();
  expect(revealedKey.length).toBeGreaterThan(10);

  await page.getByTestId("copy-api-key-btn").click();
  await expectToast(page, "API key copied to clipboard");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(revealedKey);

  await page.getByTestId("new-key-done-btn").click();
  await expect(page.getByTestId("new-key-reveal-dialog")).toBeHidden();

  const item = apiKeyItem(page, keyName);
  await expect(item).toBeVisible();
  await expect(item.getByText("Read only")).toBeVisible();

  await item.getByTestId("api-key-delete-btn").click();
  await item.getByTestId("api-key-confirm-delete").click();
  await expectToast(page, "API key deleted");
  await expect(item).toBeHidden();
  await expect(page.getByTestId("api-keys-empty")).toBeVisible();
});

function apiKeyItem(page: Page, name: string): Locator {
  return page.locator("[data-test='api-key-item']").filter({ hasText: name });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
