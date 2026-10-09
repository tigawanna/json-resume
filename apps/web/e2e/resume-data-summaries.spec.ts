import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectLibraryCrud } from "./support/library-crud";

test("creates, edits, and deletes a summary from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const text = `E2E summary for standalone routes ${uniqueId}`;
  const updatedText = `E2E summary updated for standalone routes ${uniqueId}`;

  await expectLibraryCrud(page, {
    path: "/summaries",
    slug: "summaries",
    noun: "Summary",
    createdText: text,
    updatedText,
    fillCreate: async (dialog) => {
      await dialog.locator("textarea").first().fill(text);
    },
    fillEdit: async (dialog) => {
      const textInput = dialog.locator("textarea").first();
      await expect(textInput).toHaveValue(text);
      await textInput.fill(updatedText);
    },
  });
});
