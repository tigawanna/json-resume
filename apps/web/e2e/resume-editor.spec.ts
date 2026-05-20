import { expect, test } from "@playwright/test";
import { resumeDocumentV1Schema } from "@/features/resume/resume-schema";
import { signUp } from "./support/auth";
import { createResumeFromDashboard } from "./support/resume-workflow";

test.setTimeout(60_000);

test("saves edited and newly added resume parts across the whole editor flow", async ({ page }) => {
  const { uniqueId } = await signUp(page);
  await createResumeFromDashboard(page);
  await expect(page.getByTestId("resume-edit-tab")).toBeVisible();

  const metadata = page.getByTestId("metadata-form");
  await metadata.getByLabel("Resume Name").fill(`Target Resume ${uniqueId}`);
  await metadata.getByLabel("Full Name").fill(`Alex Persist ${uniqueId}`);
  await metadata.getByLabel("Headline").fill("Principal Product Engineer");
  await metadata
    .getByLabel("Description", { exact: true })
    .fill("Internal targeting notes for the e2e flow.");
  await metadata.getByLabel("Job Description").fill("Build reliable full-stack product systems.");
  await metadata.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Resume updated")).toBeVisible();

  const contacts = page.getByTestId("contacts-form");
  await contacts.getByRole("button", { name: "Add Contact" }).click();
  const contactInputs = contacts.locator("input");
  const contactInputCount = await contactInputs.count();
  await contactInputs.nth(contactInputCount - 3).fill("phone");
  await contactInputs.nth(contactInputCount - 2).fill("+1 555 0100");
  await contactInputs.nth(contactInputCount - 1).fill("Phone");
  await contacts.getByRole("button", { name: "Save Contacts" }).click();
  await expect(page.getByText("Contacts saved")).toBeVisible();

  await page.getByRole("button", { name: "Links" }).click();
  const links = page.getByTestId("links-form");
  await links.getByRole("button", { name: "Add Link" }).click();
  const linkInputs = links.locator("input");
  const linkInputCount = await linkInputs.count();
  await linkInputs.nth(linkInputCount - 3).fill("Portfolio");
  await linkInputs.nth(linkInputCount - 2).fill("https://example.com/alex");
  await linkInputs.nth(linkInputCount - 1).fill("globe");
  await links.getByRole("button", { name: "Save Links" }).click();
  await expect(page.getByText("Links saved")).toBeVisible();

  const summaryText =
    "Product-minded full-stack engineer who turns ambiguous ideas into durable shipped systems.";
  const summary = page.getByTestId("summary-form");
  await summary.getByLabel("Professional Summary").fill(summaryText);
  await summary.getByRole("button", { name: "Save Summary" }).click();
  await expect(page.getByText("Summary saved")).toBeVisible();

  await page.getByRole("button", { name: "Add Experience" }).click();
  const experience = page.getByTestId("add-experience-form");
  await experience.getByLabel("Company").fill("Signal Works");
  await experience.getByLabel("Role").fill("Staff Platform Engineer");
  await experience.getByLabel("Start Date").fill("2026-02");
  await experience.getByLabel("End Date").fill("Present");
  await experience.getByLabel("Location").fill("Remote");
  await experience.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Experience added")).toBeVisible();

  const addedExperienceCard = page
    .locator("[data-test^='experience-card-']")
    .filter({ has: page.getByText("Staff Platform Engineer at Signal Works") });
  await addedExperienceCard.getByRole("button", { name: "Edit experience" }).click();
  const editingExperienceCard = page
    .locator("[data-test^='experience-card-']")
    .filter({ has: page.getByRole("button", { name: "Add Bullet" }) });
  await editingExperienceCard.getByRole("button", { name: "Add Bullet" }).click();
  await editingExperienceCard
    .locator("input")
    .last()
    .fill("Launched a typed resume workflow with reliable persistence checks.");
  await editingExperienceCard.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Experience saved")).toBeVisible();

  await page.getByRole("button", { name: "Projects" }).click();
  await page.getByRole("button", { name: "Add Project" }).click();
  const project = page.getByTestId("add-project-form");
  await project.getByPlaceholder("Enter Project Name").fill("resume-integrity-suite");
  await project
    .getByLabel("Repository URL")
    .fill("https://github.com/example/resume-integrity-suite");
  await project.getByLabel("Homepage URL").fill("https://example.com/resume-integrity-suite");
  await project
    .getByPlaceholder("Enter Description")
    .fill("A Playwright suite that checks resume part persistence.");
  await project.getByPlaceholder("e.g. React").fill("Playwright");
  await project.getByPlaceholder("e.g. React").press("Enter");
  await project.getByPlaceholder("e.g. React").fill("TypeScript");
  await project.getByPlaceholder("e.g. React").press("Enter");
  await project.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Project added")).toBeVisible();

  await page.getByRole("button", { name: "Skills" }).click();
  const skills = page.getByTestId("skills-form");
  await skills.getByRole("button", { name: "Add Group" }).click();
  await skills.getByPlaceholder("Group name (e.g. Languages)").last().fill("Quality");
  await skills.getByPlaceholder("Type skill and press Enter").last().fill("Persistence Testing");
  await skills.getByPlaceholder("Type skill and press Enter").last().press("Enter");
  await skills.getByRole("button", { name: "Save Skills" }).click();
  await expect(page.getByText("Skills saved")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("resume-workbench")).toBeVisible();
  await page.getByRole("tab", { name: "JSON" }).click();
  await expect(page.getByTestId("resume-json-tab")).toBeVisible();
  await page.getByRole("radio", { name: "Raw" }).click();

  const rawJson = await page.getByTestId("resume-json-tab").locator("textarea").inputValue();
  const doc = resumeDocumentV1Schema.parse(JSON.parse(rawJson));

  expect(doc.header.fullName).toBe(`Alex Persist ${uniqueId}`);
  expect(doc.header.headline).toBe("Principal Product Engineer");
  expect(doc.header.email).toBe("jordan.lee@example.com");
  expect(doc.header.location).toBe("Remote");
  expect(doc.header.links).toEqual(
    expect.arrayContaining([{ label: "Portfolio", url: "https://example.com/alex" }]),
  );
  expect(doc.summary.text).toBe(summaryText);
  expect(doc.experience.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        company: "Signal Works",
        role: "Staff Platform Engineer",
        start: "2026-02",
        end: "Present",
        location: "Remote",
        bullets: ["Launched a typed resume workflow with reliable persistence checks."],
      }),
    ]),
  );
  expect(doc.projects.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "resume-integrity-suite",
        url: "https://github.com/example/resume-integrity-suite",
        homepageUrl: "https://example.com/resume-integrity-suite",
        description: "A Playwright suite that checks resume part persistence.",
        tech: ["Playwright", "TypeScript"],
      }),
    ]),
  );
  expect(doc.skills.groups).toEqual(
    expect.arrayContaining([
      {
        name: "Quality",
        items: ["Persistence Testing"],
      },
    ]),
  );
});
