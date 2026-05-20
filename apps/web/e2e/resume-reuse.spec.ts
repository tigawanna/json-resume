import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import {
  getCounts,
  getResumeCount,
  getUserIdByEmail,
  reusablePartCountQueries,
  resumeAssociationCountQueries,
} from "./support/database";
import { createResumeFromDashboard } from "./support/resume-workflow";

test("creating another default resume reuses available parts instead of duplicating them", async ({
  page,
}) => {
  const { email } = await signUp(page);
  await createResumeFromDashboard(page);

  const userId = await getUserIdByEmail(email);
  const reusableCountsAfterFirstResume = await getCounts(reusablePartCountQueries, userId);
  const associationCountsAfterFirstResume = await getCounts(resumeAssociationCountQueries, userId);

  await page.goto("/resumes");
  await expect(page.getByTestId("resume-list-page")).toBeVisible();
  await page.getByRole("button", { name: "New Resume" }).click();
  await expect(page.getByTestId("resume-workbench")).toBeVisible();

  const reusableCountsAfterSecondResume = await getCounts(reusablePartCountQueries, userId);
  const associationCountsAfterSecondResume = await getCounts(resumeAssociationCountQueries, userId);

  expect(await getResumeCount(userId)).toBe(2);
  expect([...reusableCountsAfterSecondResume.entries()]).toEqual([
    ...reusableCountsAfterFirstResume.entries(),
  ]);

  for (const [key, countAfterFirstResume] of associationCountsAfterFirstResume) {
    expect(associationCountsAfterSecondResume.get(key)).toBe(countAfterFirstResume * 2);
  }
});
