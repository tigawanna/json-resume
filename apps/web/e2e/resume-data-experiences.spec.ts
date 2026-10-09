import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectLibraryCrud } from "./support/library-crud";

test("creates, edits, and deletes an experience from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const role = `E2E Route Engineer ${uniqueId}`;
  const updatedRole = `Senior E2E Route Engineer ${uniqueId}`;

  await expectLibraryCrud(page, {
    path: "/experiences",
    slug: "experiences",
    noun: "Experience",
    createdText: role,
    updatedText: updatedRole,
    fillCreate: async (dialog) => {
      const inputs = dialog.locator("input");
      await inputs.nth(0).fill(role);
      await inputs.nth(1).fill(`Route Systems ${uniqueId}`);
      await inputs.nth(2).fill("2026-01");
      await inputs.nth(3).fill("Present");
      await inputs.nth(4).fill("Remote");
    },
    fillEdit: async (dialog) => {
      const roleInput = dialog.locator("input").nth(0);
      await expect(roleInput).toHaveValue(role);
      await roleInput.fill(updatedRole);
    },
  });
});
