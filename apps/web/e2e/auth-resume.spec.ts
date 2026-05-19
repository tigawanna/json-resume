import { expect, test } from "@playwright/test";

test("creates a resume through the authenticated UI", async ({ page }) => {
  const uniqueId = Date.now().toString(36);
  const email = `e2e-${uniqueId}@example.com`;
  const password = "test-password-123";

  const signupResponse = await page.request.post("/api/auth/sign-up/email", {
    data: {
      email,
      password,
      name: `E2E User ${uniqueId}`,
    },
  });
  expect(signupResponse.ok()).toBeTruthy();

  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-page")).toBeVisible();

  await page.getByTestId("dashboard-primary-action").click();
  await expect(page.getByTestId("resume-list-page")).toBeVisible();

  await page.getByRole("button", { name: "New Resume" }).click();
  await expect(page.locator("[data-test^='resume-card-']").first()).toBeVisible();
});
