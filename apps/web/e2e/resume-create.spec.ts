import { test } from "@playwright/test";
import { signUp } from "./support/auth";
import { createResumeFromDashboard } from "./support/resume-workflow";

test("creates a resume through the authenticated UI", async ({ page }) => {
  await signUp(page);
  await createResumeFromDashboard(page);
});
