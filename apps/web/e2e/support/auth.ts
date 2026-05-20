import { expect, type Page } from "@playwright/test";

export async function signUp(page: Page) {
  const uniqueId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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

  return { email, password, uniqueId };
}
