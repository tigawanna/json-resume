import { expect, test } from "@playwright/test";
import { signUp } from "./support/auth";
import {
  educationSeedRows,
  experienceSeedRows,
  expectToast,
  projectSeedRows,
  seedCollection,
  waitForLocalDb,
} from "./resume-data/local-db";
import { openEditorSection } from "./support/resume-editor-sections";

test(
  "workbench add/edit/sort/pick-existing/skills persist into preview and back to edit",
  { tag: "@smoke" },
  async ({ page }) => {
    const { uniqueId } = await signUp(page);
    const prefix = `Wb${uniqueId.slice(0, 8)}`;
    const fullName = `Ada Workbench ${prefix}`;
    const headline = "Local-first résumé engineer";
    const summary = `Shipped a typed local-first workbench ${prefix}.`;
    const addedRole = `Staff Engineer ${prefix}`;
    const addedCompany = `Signal Works ${prefix}`;
    const editedBullet = `Verified preview persistence ${prefix}`;
    const pickedRole = `${prefix} Needle Role`;
    const pickedCompany = `${prefix} Needle Co`;
    const school = `${prefix} Institute`;
    const projectName = `${prefix} integrity-suite`;
    const skillName = `Persistence Testing ${prefix}`;

    await page.goto("/resumes");
    await waitForLocalDb(page);
    await seedCollection(page, "resumeExperience", experienceSeedRows(prefix, 8));
    await seedCollection(page, "resumeEducation", educationSeedRows(prefix, 4));
    await seedCollection(page, "resumeProject", projectSeedRows(prefix, 4));

    await expect(page.getByTestId("resumes-list-page")).toBeVisible();
    await page.getByTestId("add-resumes-btn").evaluate((el: HTMLButtonElement) => el.click());
    const createDialog = page.getByRole("dialog");
    await createDialog.locator("input").first().fill(`${prefix} Target Resume`);
    await createDialog
      .getByRole("button", { name: /create/i })
      .evaluate((el: HTMLButtonElement) => el.click());
    await expectToast(page, "Résumé created");

    await page
      .getByTestId("resumes-table")
      .getByTestId("row-details-btn")
      .evaluate((el: HTMLButtonElement) => el.click());
    await expect(page.getByTestId("resume-workbench")).toBeVisible();
    await expect(page.getByTestId("resume-edit-tab")).toBeVisible();

    const metadata = page.getByTestId("metadata-form");
    await metadata.getByLabel("Full Name").fill(fullName);
    await metadata.getByLabel("Headline").fill(headline);
    await metadata.getByRole("button", { name: "Save details" }).click();
    await expectToast(page, "Details saved");

    const summaryForm = page.getByTestId("summary-form");
    await summaryForm.getByLabel("Professional Summary").fill(summary);
    await summaryForm.getByRole("button", { name: "Save Summary" }).click();
    await expectToast(page, "Summary saved");

    await page.getByRole("button", { name: "Add Experience" }).click();
    const experience = page.getByTestId("add-experience-form");
    await experience.getByLabel("Company").fill(addedCompany);
    await experience.getByLabel("Role").fill(addedRole);
    await experience.getByLabel("Start Date").fill("2024-01");
    await experience.getByLabel("End Date").fill("Present");
    await experience.getByLabel("Location").fill("Remote");
    await experience.getByRole("button", { name: "Add", exact: true }).click();
    await expectToast(page, "Experience added");

    const addedCard = page
      .locator("[data-test^='experience-card-']")
      .filter({ hasText: `${addedRole} at ${addedCompany}` });
    await addedCard.getByRole("button", { name: "Edit experience" }).click();
    const editingCard = page
      .locator("[data-test^='experience-card-']")
      .filter({ has: page.getByRole("button", { name: "Add Bullet" }) });
    await editingCard.getByRole("button", { name: "Add Bullet" }).click();
    await editingCard.locator("input").last().fill(editedBullet);
    await editingCard.getByRole("button", { name: "Save", exact: true }).click();
    await expectToast(page, "Experience saved");
    await expect(addedCard).toContainText(editedBullet);

    await page
      .getByTestId("experience-section")
      .getByRole("button", { name: "Pick from Existing" })
      .evaluate((el: HTMLButtonElement) => el.click());
    const pick = page.getByTestId("pick-from-existing-dialog");
    await expect(pick).toBeVisible();
    await pick.getByTestId("pick-search-input").fill(pickedRole);
    await expect(pick.getByTestId("pick-results")).toContainText(
      `${pickedRole} at ${pickedCompany}`,
    );
    await pick
      .getByTestId("pick-results")
      .getByRole("button")
      .filter({ hasText: pickedRole })
      .first()
      .evaluate((el: HTMLButtonElement) => el.click());
    await pick
      .getByRole("button", { name: /Add \(/ })
      .evaluate((el: HTMLButtonElement) => el.click());
    await expectToast(page, "Added 1 experience(s)");

    await page.getByRole("button", { name: "Add Experience" }).click();
    const second = page.getByTestId("add-experience-form");
    await second.getByLabel("Company").fill(`${prefix} Second Co`);
    await second.getByLabel("Role").fill(`${prefix} Second Role`);
    await second.getByRole("button", { name: "Add", exact: true }).click();
    await expectToast(page, "Experience added");
    await expect(page.getByTestId("experience-section")).toContainText(`${prefix} Second Role`);

    const firstCard = page.locator("[data-test^='experience-card-']").first();
    const firstTitle =
      (await firstCard.locator("[data-slot='card-title']").first().textContent()) ?? "";
    await firstCard.getByRole("button", { name: "Move experience down" }).click();
    await expect(page.locator("[data-test^='experience-card-']").nth(1)).toContainText(firstTitle);

    await openEditorSection(page, "Education", "education-section");
    await page.getByRole("button", { name: "Add Education" }).click();
    const education = page.getByTestId("add-education-form");
    await education.getByLabel("School").fill(school);
    await education.getByLabel("Qualification").fill("BSc Computer Science");
    await education.getByRole("button", { name: "Add", exact: true }).click();
    await expectToast(page, "Education added");
    await expect(page.getByTestId("education-section")).toContainText(school);

    await openEditorSection(page, "Projects", "project-section");
    await page.getByRole("button", { name: "Add Project" }).click();
    const project = page.getByTestId("add-project-form");
    await expect(project).toBeVisible();
    await project.locator("input").first().fill(projectName);
    await project.locator("textarea").first().fill("Playwright suite for the local workbench.");
    await project.getByPlaceholder("e.g. React").fill("Playwright");
    await project.getByPlaceholder("e.g. React").press("Enter");
    await project.getByRole("button", { name: "Add", exact: true }).click();
    await expectToast(page, "Project added");
    await expect(page.getByTestId("project-section")).toContainText(projectName);

    const skills = await openEditorSection(page, "Skills", "skills-form");
    await skills.getByRole("button", { name: "Add Group" }).click();
    await skills.getByPlaceholder("Group name (e.g. Languages)").last().fill("Quality");
    await skills.getByPlaceholder("Type skill and press Enter").last().fill(skillName);
    await skills.getByPlaceholder("Type skill and press Enter").last().press("Enter");
    await skills.getByRole("button", { name: "Save Skills" }).click();
    await expectToast(page, "Skills saved");
    await expect(skills).toContainText(skillName);

    await page.getByRole("tab", { name: "Preview" }).click();
    await expect(page.getByTestId("resume-preview-tab")).toBeVisible();
    const preview = page
      .getByTestId("resume-preview-paper-light")
      .or(page.getByTestId("resume-preview-paper-dark"));
    await expect(preview).toContainText(fullName);
    await expect(preview).toContainText(headline);
    await expect(preview).toContainText(summary);
    await expect(preview).toContainText(addedCompany);
    await expect(preview).toContainText(editedBullet);
    await expect(preview).toContainText(`${prefix} Second Co`);
    await expect(preview).toContainText(school);
    await expect(preview).toContainText(projectName);
    await expect(preview).toContainText(skillName);

    await page.getByRole("tab", { name: "Edit" }).click();
    await expect(page.getByTestId("resume-edit-tab")).toBeVisible();
    await expect(page.getByTestId("metadata-form").getByLabel("Full Name")).toHaveValue(fullName);
    await expect(page.getByTestId("summary-form").getByLabel("Professional Summary")).toHaveValue(
      summary,
    );
    await expect(page.getByTestId("experience-section")).toContainText(addedRole);
    await expect(page.getByTestId("experience-section")).toContainText(editedBullet);
    await expect(page.getByTestId("education-section")).toContainText(school);
    await expect(await openEditorSection(page, "Projects", "project-section")).toContainText(
      projectName,
    );
    await expect(await openEditorSection(page, "Skills", "skills-form")).toContainText(skillName);
  },
);
