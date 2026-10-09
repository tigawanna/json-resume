import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectLibraryCrud } from "./support/library-crud";

test("creates, edits, and deletes a skill group from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const name = `E2E Skills ${uniqueId}`;
  const updatedName = `E2E Skills Updated ${uniqueId}`;

  await expectLibraryCrud(page, {
    path: "/skill-groups",
    slug: "skill-groups",
    noun: "Skill group",
    createdText: name,
    updatedText: updatedName,
    fillCreate: async (dialog) => {
      await dialog.getByTestId("skill-group-name-input").fill(name);
    },
    fillEdit: async (dialog) => {
      const nameInput = dialog.locator("input").first();
      await expect(nameInput).toHaveValue(name);
      await nameInput.fill(updatedName);
    },
  });
});
