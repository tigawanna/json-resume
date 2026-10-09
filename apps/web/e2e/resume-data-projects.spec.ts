import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectLibraryCrud } from "./support/library-crud";

test("creates, edits, and deletes a project from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const name = `e2e-route-project-${uniqueId}`;
  const updatedName = `e2e-route-project-updated-${uniqueId}`;

  await expectLibraryCrud(page, {
    path: "/resume-projects",
    slug: "resume-projects",
    noun: "Project",
    createdText: name,
    updatedText: updatedName,
    fillCreate: async (dialog) => {
      const inputs = dialog.locator("input");
      await inputs.nth(0).fill(name);
      await inputs.nth(1).fill(`https://github.com/example/${name}`);
      await dialog.locator("textarea").first().fill("Checks standalone project CRUD.");
    },
    fillEdit: async (dialog) => {
      const nameInput = dialog.locator("input").nth(0);
      await expect(nameInput).toHaveValue(name);
      await nameInput.fill(updatedName);
    },
  });
});
