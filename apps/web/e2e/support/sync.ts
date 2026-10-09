import { expect, type Page } from "@playwright/test";

async function openSyncDrawer(page: Page) {
  await page.getByTestId("dashboard-sync-status").click();
  const drawer = page.getByTestId("dashboard-sync-drawer");
  await expect(drawer).toBeVisible();
  return drawer;
}

async function closeSyncDrawer(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("dashboard-sync-drawer")).toBeHidden();
}

/** Turns managed sync on through the header drawer, the way a signed-in user does. */
export async function enableManagedSync(page: Page) {
  const drawer = await openSyncDrawer(page);
  const toggle = drawer.getByTestId("managed-sync-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("dashboard-sync-status")).toHaveAttribute(
    "data-sync-state",
    "synced",
  );
  await closeSyncDrawer(page);
}

/**
 * Presses "Sync now" and waits for the outcome toast. The app does not push
 * after each edit — only on load, on enabling sync, and on "Sync now".
 */
export async function syncNow(page: Page) {
  const drawer = await openSyncDrawer(page);
  await drawer.getByTestId("managed-sync-now-btn").click();
  const outcome = page
    .locator("[data-sonner-toast]")
    .filter({ hasText: /Sync (finished|failed|skipped)/ })
    .last();
  await expect(outcome).toBeVisible();
  await expect(outcome).toContainText("Sync finished");
  await closeSyncDrawer(page);
}
