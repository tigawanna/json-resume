import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectLibraryCrud } from "./support/library-crud";

test("creates, edits, and deletes a certification from the standalone route", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  const name = `E2E Cloud Architect ${uniqueId}`;
  const updatedName = `E2E Cloud Architect Professional ${uniqueId}`;

  await expectLibraryCrud(page, {
    path: "/certifications",
    slug: "certifications",
    noun: "Certification",
    createdText: name,
    updatedText: updatedName,
    fillCreate: async (dialog) => {
      const inputs = dialog.locator("input");
      await inputs.nth(0).fill(name);
      await inputs.nth(1).fill("E2E Certification Board");
      await inputs.nth(2).fill("2026");
      await inputs.nth(3).fill("https://example.com/cert");
    },
    fillEdit: async (dialog) => {
      const nameInput = dialog.locator("input").nth(0);
      await expect(nameInput).toHaveValue(name);
      await nameInput.fill(updatedName);
    },
  });
});
