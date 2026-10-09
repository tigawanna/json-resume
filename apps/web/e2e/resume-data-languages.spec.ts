import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectLibraryCrud, pickComboboxOption } from "./support/library-crud";

test("creates, edits, and deletes a language from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const name = `E2E Language ${uniqueId}`;
  const updatedName = `E2E Language Updated ${uniqueId}`;

  await expectLibraryCrud(page, {
    path: "/languages",
    slug: "languages",
    noun: "Language",
    createdText: name,
    updatedText: updatedName,
    fillCreate: async (dialog) => {
      await dialog.locator("input").nth(0).fill(name);
      await pickComboboxOption(dialog, 0, "Fluent");
    },
    fillEdit: async (dialog) => {
      const nameInput = dialog.locator("input").nth(0);
      await expect(nameInput).toHaveValue(name);
      await nameInput.fill(updatedName);
    },
  });
});
