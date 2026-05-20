import { test } from "@playwright/test";
import { signUp } from "./support/auth";
import { expectResumeItemChanges } from "./support/resume-part-actions";
import { createResumeFromDashboard } from "./support/resume-workflow";

test.setTimeout(180_000);

test("adds, edits, and removes resume parts in the editor", async ({ page }) => {
  await signUp(page);
  await createResumeFromDashboard(page);

  await expectResumeItemChanges(page);
});
