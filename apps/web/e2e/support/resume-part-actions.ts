import { expect, type Page } from "@playwright/test";
import { expectInputValue, expectNoInputValue, openEditorSection } from "./resume-editor-sections";

export async function expectResumeItemChanges(page: Page) {
  await updateSummaryItem(page);
  await addAndRemoveContact(page);
  await addAndRemoveLink(page);
  await addUpdateAndDeleteExperience(page);
  await addUpdateAndDeleteEducation(page);
  await addUpdateAndDeleteProject(page);
  await addUpdateAndDeleteSkillGroup(page);
  await addUpdateAndDeleteTalk(page);
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}

async function updateSummaryItem(page: Page) {
  const summary = await openEditorSection(page, "Summary", "summary-form");
  const updatedSummary = "E2E summary update visible in the editor.";

  await summary.getByLabel("Professional Summary").fill(updatedSummary);
  await summary.getByRole("button", { name: "Save Summary" }).click();

  await expectToast(page, "Summary saved");
  await expect(summary.getByLabel("Professional Summary")).toHaveValue(updatedSummary);
}

async function addAndRemoveContact(page: Page) {
  const contacts = await openEditorSection(page, "Contacts", "contacts-form");
  const addedValue = "+1 555 0200";

  await contacts.getByRole("button", { name: "Add Contact" }).click();
  const row = contacts.locator("div.flex.items-end.gap-2").last();
  await row.locator("input").nth(0).fill("phone");
  await row.locator("input").nth(1).fill(addedValue);
  await row.locator("input").nth(2).fill("Phone");
  await contacts.getByRole("button", { name: "Save Contacts" }).click();

  await expectToast(page, "Contacts saved");
  await expectInputValue(contacts, addedValue);

  await row.getByRole("button").click();
  await contacts.getByRole("button", { name: "Save Contacts" }).click();

  await expectToast(page, "Contacts saved");
  await expectNoInputValue(contacts, addedValue);
}

async function addAndRemoveLink(page: Page) {
  const links = await openEditorSection(page, "Links", "links-form");
  const addedUrl = "https://example.com/e2e-link";

  await links.getByRole("button", { name: "Add Link" }).click();
  const row = links.locator("div.flex.items-end.gap-2").last();
  await row.locator("input").nth(0).fill("E2E Link");
  await row.locator("input").nth(1).fill(addedUrl);
  await row.locator("input").nth(2).fill("globe");
  await links.getByRole("button", { name: "Save Links" }).click();

  await expectToast(page, "Links saved");
  await expectInputValue(links, addedUrl);

  await row.getByRole("button").click();
  await links.getByRole("button", { name: "Save Links" }).click();

  await expectToast(page, "Links saved");
  await expectNoInputValue(links, addedUrl);
}

async function addUpdateAndDeleteExperience(page: Page) {
  let experience = await openEditorSection(page, "Experience", "experience-section");

  await experience.getByRole("button", { name: "Add Experience" }).click();
  const form = page.getByTestId("add-experience-form");
  await form.getByLabel("Company").fill("E2E Systems");
  await form.getByLabel("Role").fill("UI Verification Engineer");
  await form.getByLabel("Start Date").fill("2026-01");
  await form.getByLabel("End Date").fill("Present");
  await form.getByLabel("Location").fill("Remote");
  await form.getByRole("button", { name: "Add" }).click();

  await expectToast(page, "Experience added");
  const addedCard = experience
    .locator("[data-test^='experience-card-']")
    .filter({ hasText: "UI Verification Engineer at E2E Systems" });
  await expect(addedCard).toBeVisible();

  await addedCard.getByRole("button", { name: "Edit experience" }).click();
  const editingCard = experience
    .locator("[data-test^='experience-card-']")
    .filter({ has: page.getByRole("button", { name: "Add Bullet" }) });
  await editingCard.locator("input").first().fill("Senior UI Verification Engineer");
  await editingCard.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Experience saved");
  await page.reload();
  experience = await openEditorSection(page, "Experience", "experience-section");
  const updatedCard = experience
    .locator("[data-test^='experience-card-']")
    .filter({ hasText: "Senior UI Verification Engineer at E2E Systems" });
  await expect(updatedCard).toBeVisible();

  await updatedCard.getByRole("button", { name: "Delete experience" }).click();

  await expectToast(page, "Experience removed");
  await page.reload();
  experience = await openEditorSection(page, "Experience", "experience-section");
  await expect(updatedCard).toBeHidden();
}

async function addUpdateAndDeleteEducation(page: Page) {
  let education = await openEditorSection(page, "Education", "education-section");

  await education.getByRole("button", { name: "Add Education" }).click();
  const form = page.getByTestId("add-education-form");
  await form.getByLabel("School").fill("E2E Institute");
  await form.getByLabel("Qualification").fill("Certificate");
  await form.getByLabel("Field of Study").fill("Interface Testing");
  await form.getByLabel("End Date").fill("2026");
  await form.getByPlaceholder("Enter Description").fill("Focused UI feedback checks.");
  await form.getByRole("button", { name: "Add" }).click();

  await expectToast(page, "Education added");
  const addedCard = education
    .locator("[data-test^='education-card-']")
    .filter({ hasText: "Certificate in Interface Testing" });
  await expect(addedCard).toBeVisible();

  await addedCard.locator("button").nth(2).click();
  const editingCard = education
    .locator("[data-test^='education-card-']")
    .filter({ has: page.locator("textarea") });
  await editingCard.locator("input").first().fill("E2E Institute Updated");
  await editingCard.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Education saved");
  await page.reload();
  education = await openEditorSection(page, "Education", "education-section");
  const updatedCard = education
    .locator("[data-test^='education-card-']")
    .filter({ hasText: "E2E Institute Updated" });
  await expect(updatedCard).toBeVisible();

  await updatedCard.locator("button").nth(3).click();

  await expectToast(page, "Education removed");
  await page.reload();
  education = await openEditorSection(page, "Education", "education-section");
  await expect(updatedCard).toBeHidden();
}

async function addUpdateAndDeleteProject(page: Page) {
  let projects = await openEditorSection(page, "Projects", "project-section");

  await projects.getByRole("button", { name: "Add Project" }).click();
  const form = page.getByTestId("add-project-form");
  await form.getByPlaceholder("Enter Project Name").fill("e2e-visibility-check");
  await form
    .getByPlaceholder("Enter Repository URL")
    .fill("https://github.com/example/e2e-visibility-check");
  await form
    .getByPlaceholder("Enter Description")
    .fill("Checks that edited project cards update on screen.");
  await form.getByPlaceholder("e.g. React").fill("Playwright");
  await form.getByPlaceholder("e.g. React").press("Enter");
  await form.getByRole("button", { name: "Add" }).click();

  await expectToast(page, "Project added");
  const addedCard = projects
    .locator("[data-test^='project-card-']")
    .filter({ hasText: "e2e-visibility-check" });
  await expect(addedCard).toBeVisible();

  await addedCard.locator("button").nth(2).click();
  const editingCard = projects
    .locator("[data-test^='project-card-']")
    .filter({ has: page.locator("textarea") });
  await editingCard.locator("input").first().fill("e2e-visibility-check-updated");
  await editingCard.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Project saved");
  await page.reload();
  projects = await openEditorSection(page, "Projects", "project-section");
  const updatedCard = projects
    .locator("[data-test^='project-card-']")
    .filter({ hasText: "e2e-visibility-check-updated" });
  await expect(updatedCard).toBeVisible();

  await updatedCard.locator("button").nth(3).click();

  await expectToast(page, "Project removed");
  await page.reload();
  projects = await openEditorSection(page, "Projects", "project-section");
  await expect(updatedCard).toBeHidden();
}

async function addUpdateAndDeleteSkillGroup(page: Page) {
  const skills = await openEditorSection(page, "Skills", "skills-form");

  await skills.getByRole("button", { name: "Add Group" }).click();
  const group = skills.locator(".rounded-lg.border").last();
  await group.getByPlaceholder("Group name (e.g. Languages)").fill("E2E Skills");
  await group.getByPlaceholder("Type skill and press Enter").fill("Visible Skill");
  await group.getByPlaceholder("Type skill and press Enter").press("Enter");
  await skills.getByRole("button", { name: "Save Skills" }).click();

  await expectToast(page, "Skills saved");
  await expectInputValue(skills, "E2E Skills");
  await expect(skills.getByText("Visible Skill")).toBeVisible();

  await group.getByPlaceholder("Group name (e.g. Languages)").fill("E2E Skills Updated");
  await skills.getByRole("button", { name: "Save Skills" }).click();

  await expectToast(page, "Skills saved");
  await expectInputValue(skills, "E2E Skills Updated");

  await group.getByRole("button").first().click();
  await skills.getByRole("button", { name: "Save Skills" }).click();

  await expectToast(page, "Skills saved");
  await expectNoInputValue(skills, "E2E Skills Updated");
}

async function addUpdateAndDeleteTalk(page: Page) {
  let talks = await openEditorSection(page, "Talks", "talks-section");

  await talks.getByRole("button", { name: "Add Talk" }).click();
  const form = page.getByTestId("add-talk-form");
  await form.getByLabel("Title").fill("E2E UI visibility talk");
  await form.getByLabel("Event").fill("Testing Guild");
  await form.getByLabel("Date").fill("2026");
  await form.getByPlaceholder("Enter Description").fill("A small talk used by the UI test.");
  await form.getByRole("button", { name: "Add Talk" }).click();

  await expectToast(page, "Talk added");
  const addedCard = talks
    .locator("[data-test^='talk-card-']")
    .filter({ hasText: "E2E UI visibility talk" });
  await expect(addedCard).toBeVisible();

  await addedCard.locator("button").nth(2).click();
  const editingCard = talks
    .locator("[data-test^='talk-card-']")
    .filter({ has: page.locator("textarea") });
  await editingCard.locator("input").first().fill("E2E UI visibility talk updated");
  await editingCard.getByRole("button", { name: "Save" }).click();

  await expectToast(page, "Talk saved");
  await page.reload();
  talks = await openEditorSection(page, "Talks", "talks-section");
  const updatedCard = talks
    .locator("[data-test^='talk-card-']")
    .filter({ hasText: "E2E UI visibility talk updated" });
  await expect(updatedCard).toBeVisible();

  await updatedCard.locator("button").nth(3).click();

  await expectToast(page, "Talk removed");
  await page.reload();
  talks = await openEditorSection(page, "Talks", "talks-section");
  await expect(updatedCard).toBeHidden();
}
