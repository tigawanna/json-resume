import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectLibraryCrud } from "./support/library-crud";

test("creates, edits, and deletes a volunteer entry from the standalone route", async ({
  page,
}) => {
  const { uniqueId } = await signUp(page);
  const role = `E2E Mentor ${uniqueId}`;
  const updatedRole = `E2E Lead Mentor ${uniqueId}`;

  await expectLibraryCrud(page, {
    path: "/volunteers",
    slug: "volunteers",
    noun: "Volunteer",
    createdText: role,
    updatedText: updatedRole,
    fillCreate: async (dialog) => {
      const inputs = dialog.locator("input");
      await inputs.nth(0).fill(`E2E Code Club ${uniqueId}`);
      await inputs.nth(1).fill(role);
      await inputs.nth(2).fill("2025-01");
      await inputs.nth(3).fill("Present");
    },
    fillEdit: async (dialog) => {
      const roleInput = dialog.locator("input").nth(1);
      await expect(roleInput).toHaveValue(role);
      await roleInput.fill(updatedRole);
    },
  });
});
