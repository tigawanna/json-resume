import { expect, test, type Page } from "@playwright/test";
import { expectToast } from "./resume-data/local-db";
import { signUp } from "./support/auth";
import { createAndOpenResume } from "./support/resume-workflow";

test("picking an existing experience into another resume reuses the library row", async ({
  page,
}) => {
  const { uniqueId } = await signUp(page);
  const role = `Reuse Role ${uniqueId}`;
  const company = `Reuse Co ${uniqueId}`;

  await createAndOpenResume(page, `Reuse A ${uniqueId}`);
  await page.getByRole("button", { name: "Add Experience" }).click();
  const form = page.getByTestId("add-experience-form");
  await form.getByLabel("Company").fill(company);
  await form.getByLabel("Role").fill(role);
  await form.getByRole("button", { name: "Add", exact: true }).click();
  await expectToast(page, "Experience added");
  await expect(page.getByTestId("experience-section")).toContainText(role);
  expect(await experienceRowCount(page, role)).toBe(1);

  await createAndOpenResume(page, `Reuse B ${uniqueId}`);
  await expect(page.getByTestId("experience-section")).not.toContainText(role);
  await page
    .getByTestId("experience-section")
    .getByRole("button", { name: "Pick from Existing" })
    .click();
  const pick = page.getByTestId("pick-from-existing-dialog");
  await pick.getByTestId("pick-search-input").fill(role);
  await expect(pick.getByTestId("pick-results")).toContainText(`${role} at ${company}`);
  await pick.getByTestId("pick-results").getByRole("button").first().click();
  await pick.getByRole("button", { name: /Add \(/ }).click();
  await expectToast(page, "Added 1 experience(s)");

  await expect(page.getByTestId("experience-section")).toContainText(role);
  expect(await experienceRowCount(page, role)).toBe(1);
});

function experienceRowCount(page: Page, role: string) {
  return page.evaluate((target) => {
    const db = window.__e2eEventSourcedDb;
    if (!db) throw new Error("Local event-sourced DB is not ready");
    return db.collections.resumeExperience.toArray.filter((row) => row.role === target).length;
  }, role);
}
