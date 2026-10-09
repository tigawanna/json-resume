import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectLibraryCrud } from "./support/library-crud";

test("creates, edits, and deletes a link from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const label = `E2E Portfolio ${uniqueId}`;
  const updatedLabel = `E2E Portfolio Updated ${uniqueId}`;

  await expectLibraryCrud(page, {
    path: "/links",
    slug: "links",
    noun: "Link",
    createdText: label,
    updatedText: updatedLabel,
    fillCreate: async (dialog) => {
      const inputs = dialog.locator("input");
      await inputs.nth(0).fill(label);
      await inputs.nth(1).fill("globe");
      await inputs.nth(2).fill(`https://example.com/${uniqueId}`);
    },
    fillEdit: async (dialog) => {
      const labelInput = dialog.locator("input").nth(0);
      await expect(labelInput).toHaveValue(label);
      await labelInput.fill(updatedLabel);
    },
  });
});
