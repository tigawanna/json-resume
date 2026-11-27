import { expect, type Page } from "@playwright/test";

export async function signUp(page: Page) {
  await page.addInitScript(() => {
    const hideDevtools = () => {
      for (const el of document.querySelectorAll('[aria-label="Open TanStack Devtools"]')) {
        (el as HTMLElement).style.setProperty("display", "none", "important");
      }
    };
    const observer = new MutationObserver(hideDevtools);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    hideDevtools();
  });

  const uniqueId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const email = `e2e-${uniqueId}@example.com`;
  const password = "test-password-123";

  const nestPort = Number(process.env.PLAYWRIGHT_NEST_PORT ?? 5041);
  const nestOrigin = `http://127.0.0.1:${nestPort}`;
  const signupResponse = await page.request.post(`${nestOrigin}/api/auth/sign-up/email`, {
    data: {
      email,
      password,
      name: `E2E User ${uniqueId}`,
    },
  });
  expect(signupResponse.ok()).toBeTruthy();

  return { email, password, uniqueId };
}
