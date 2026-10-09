import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectLibraryCrud } from "./support/library-crud";

test("creates, edits, and deletes education from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const school = `E2E Institute ${uniqueId}`;
  const updatedSchool = `E2E Institute Updated ${uniqueId}`;

  await expectLibraryCrud(page, {
    path: "/education",
    slug: "education",
    noun: "Education",
    createdText: school,
    updatedText: updatedSchool,
    fillCreate: async (dialog) => {
      const inputs = dialog.locator("input");
      await inputs.nth(0).fill(school);
      await inputs.nth(1).fill("Certificate");
      await inputs.nth(2).fill("Interface Testing");
    },
    fillEdit: async (dialog) => {
      const schoolInput = dialog.locator("input").nth(0);
      await expect(schoolInput).toHaveValue(school);
      await schoolInput.fill(updatedSchool);
    },
  });
});
