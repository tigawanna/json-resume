import { expect, type Locator, type Page } from "@playwright/test";

export const editorSections = [
  "Contacts",
  "Links",
  "Summary",
  "Experience",
  "Education",
  "Projects",
  "Skills",
  "Talks",
] as const;

export async function openEditorSection(
  page: Page,
  section: (typeof editorSections)[number],
  testId: string,
) {
  const content = page.getByTestId(testId);
  if (!(await content.isVisible())) {
    await page.getByRole("button", { name: section, exact: true }).click();
  }
  await expect(content).toBeVisible();
  return content;
}

export async function expectInputValue(container: Locator, value: string) {
  await expect.poll(() => fieldValues(container)).toContain(value);
}

export async function expectNoInputValue(container: Locator, value: string) {
  await expect.poll(() => fieldValues(container)).not.toContain(value);
}

export async function expectDefaultResumeItems(page: Page) {
  await expect(page.getByTestId("resume-edit-tab")).toBeVisible();

  for (const section of editorSections) {
    await expect(page.getByRole("button", { name: section, exact: true })).toBeVisible();
  }

  const contacts = await openEditorSection(page, "Contacts", "contacts-form");
  await expectInputValue(contacts, "jordan.lee@example.com");
  await expectInputValue(contacts, "Remote");

  const links = await openEditorSection(page, "Links", "links-form");
  await expectInputValue(links, "GitHub");
  await expectInputValue(links, "https://github.com/example");

  const summary = await openEditorSection(page, "Summary", "summary-form");
  await expect(summary.getByLabel("Professional Summary")).toHaveValue(
    /Full-stack JavaScript engineer/,
  );

  const experience = await openEditorSection(page, "Experience", "experience-section");
  await expect(
    experience
      .locator("[data-test^='experience-card-']")
      .filter({ hasText: "Senior Frontend Engineer at CloudScale Systems" }),
  ).toBeVisible();

  const education = await openEditorSection(page, "Education", "education-section");
  await expectDefaultEducationCard(education);

  const projects = await openEditorSection(page, "Projects", "project-section");
  await expect(
    projects.locator("[data-test^='project-card-']").filter({ hasText: "flowboard" }),
  ).toBeVisible();

  const skills = await openEditorSection(page, "Skills", "skills-form");
  await expectInputValue(skills, "Languages");
  await expect(skills.getByText("TypeScript", { exact: true })).toBeVisible();

  const talks = await openEditorSection(page, "Talks", "talks-section");
  await expect(
    talks
      .locator("[data-test^='talk-card-']")
      .filter({ hasText: "Advanced TypeScript patterns for component libraries" }),
  ).toBeVisible();
}

async function expectDefaultEducationCard(educationSection: Locator) {
  const defaultEducationCard = educationSection
    .locator("[data-test^='education-card-']")
    .filter({ hasText: "Bachelor of Science in Computer Science" });

  await expect(defaultEducationCard).toBeVisible();
  await expect(defaultEducationCard).toContainText("University of Technology");
  await expect(defaultEducationCard).toContainText("2022");
}

async function fieldValues(container: Locator) {
  return container.locator("input, textarea").evaluateAll((elements) =>
    elements.map((element) => {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return element.value;
      }
      return "";
    }),
  );
}
