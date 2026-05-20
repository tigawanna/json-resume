import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import {
  getCounts,
  getResumeCount,
  getUserIdByEmail,
  resumeOwnedCountQueries,
  reusablePartCountQueries,
  resumeAssociationCountQueries,
} from "./support/database";
import { expectDefaultResumeItems } from "./support/resume-editor-sections";
import { createResumeFromDashboard } from "./support/resume-workflow";

test.setTimeout(90_000);

test("creating another default resume reuses available parts instead of duplicating them", async ({
  page,
}) => {
  const { email } = await signUp(page);
  await createResumeFromDashboard(page);

  const userId = await getUserIdByEmail(email);
  const reusableCountsAfterFirstResume = await getCounts(reusablePartCountQueries, userId);
  const associationCountsAfterFirstResume = await getCounts(resumeAssociationCountQueries, userId);
  const ownedCountsAfterFirstResume = await getCounts(resumeOwnedCountQueries, userId);

  await page.goto("/resumes");
  await expect(page.getByTestId("resume-list-page")).toBeVisible();
  await page.getByRole("button", { name: "New Resume" }).click();
  await expect(page.getByTestId("resume-workbench")).toBeVisible();
  await expectDefaultResumeItems(page);

  const reusableCountsAfterSecondResume = await getCounts(reusablePartCountQueries, userId);
  const associationCountsAfterSecondResume = await getCounts(resumeAssociationCountQueries, userId);
  const ownedCountsAfterSecondResume = await getCounts(resumeOwnedCountQueries, userId);

  expect(await getResumeCount(userId)).toBe(2);
  expect([...reusableCountsAfterSecondResume.entries()]).toEqual([
    ...reusableCountsAfterFirstResume.entries(),
  ]);

  for (const [key, countAfterFirstResume] of associationCountsAfterFirstResume) {
    expect(associationCountsAfterSecondResume.get(key)).toBe(countAfterFirstResume * 2);
  }

  for (const [key, countAfterFirstResume] of ownedCountsAfterFirstResume) {
    expect(ownedCountsAfterSecondResume.get(key)).toBe(countAfterFirstResume * 2);
  }
});
