import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectLibraryCrud, inputAfterLabel, pickComboboxOption } from "./support/library-crud";

test("creates, edits, and deletes a contact from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const value = `+1 555 ${uniqueId}`;
  const updatedValue = `+1 555 updated ${uniqueId}`;

  await expectLibraryCrud(page, {
    path: "/contacts",
    slug: "contacts",
    noun: "Contact",
    createdText: value,
    updatedText: updatedValue,
    fillCreate: async (dialog) => {
      await pickComboboxOption(dialog, 0, "phone");
      await inputAfterLabel(dialog, "Label").fill("Phone");
      await inputAfterLabel(dialog, "Value").fill(value);
    },
    fillEdit: async (dialog) => {
      const valueInput = inputAfterLabel(dialog, "Value");
      await expect(valueInput).toHaveValue(value);
      await valueInput.fill(updatedValue);
    },
  });
});
