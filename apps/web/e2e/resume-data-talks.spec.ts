import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectLibraryCrud } from "./support/library-crud";

test("creates, edits, and deletes a talk from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const title = `E2E Talk ${uniqueId}`;
  const updatedTitle = `E2E Talk Updated ${uniqueId}`;

  await expectLibraryCrud(page, {
    path: "/talks",
    slug: "talks",
    noun: "Talk",
    createdText: title,
    updatedText: updatedTitle,
    fillCreate: async (dialog) => {
      const inputs = dialog.locator("input");
      await inputs.nth(0).fill(title);
      await inputs.nth(1).fill("Testing Guild");
      await inputs.nth(2).fill("2026");
      await dialog.locator("textarea").first().fill("A talk used by the route test.");
    },
    fillEdit: async (dialog) => {
      const titleInput = dialog.locator("input").nth(0);
      await expect(titleInput).toHaveValue(title);
      await titleInput.fill(updatedTitle);
    },
  });
});
