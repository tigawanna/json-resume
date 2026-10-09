import { test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectResumeItemChanges } from "./support/resume-part-actions";
import { createAndOpenResume } from "./support/resume-workflow";

test.setTimeout(180_000);

test("adds, edits, and removes resume parts in the editor", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  await createAndOpenResume(page, `Parts Resume ${uniqueId}`);

  await expectResumeItemChanges(page);
});
