import { expect, test, type Page } from "@playwright/test";
import {
  resumeDocumentV1Schema,
  SECTION_KEYS,
  type ResumeDocumentV1,
} from "@/features/resume/resume-schema";
import { reloadAfterLocalWrites } from "./resume-data/local-db";
import { signUp } from "./support/auth";
import { createAndOpenResume } from "./support/resume-workflow";

function llmDocument(
  experience: ResumeDocumentV1["experience"]["items"],
  skills: string[],
): ResumeDocumentV1 {
  return {
    version: 1,
    meta: { templateId: "classic" },
    sectionOrder: [...SECTION_KEYS],
    header: {
      enabled: true,
      fullName: "Prompt Person",
      headline: "Engineer",
      email: "",
      location: "",
      links: [],
    },
    summary: { enabled: true, text: "" },
    experience: { enabled: true, items: experience },
    education: { enabled: true, items: [] },
    projects: { enabled: true, items: [] },
    talks: { enabled: false, items: [] },
    skills: { enabled: true, groups: [{ name: "Backend", items: skills }] },
    notes: { enabled: false, label: "Notes", text: "" },
  };
}

async function pasteResult(page: Page, doc: ResumeDocumentV1) {
  await page.getByRole("tab", { name: "Prompt" }).click();
  await expect(page.getByTestId("prompt-copy-section")).toBeVisible();
  const reply = `Here is your tailored résumé:\n\`\`\`json\n${JSON.stringify(doc, null, 2)}\n\`\`\``;
  await page.getByTestId("prompt-result-input").fill(reply);
  await page.getByTestId("prompt-result-import").click();
}

test("imports an LLM reply from the Prompt tab and reuses matching library rows", async ({
  page,
}) => {
  const { uniqueId } = await signUp(page);
  await createAndOpenResume(page, `Prompt Import ${uniqueId}`);
  const company = `Acme ${uniqueId}`;

  await pasteResult(
    page,
    llmDocument(
      [{ company, role: "Engineer", start: "2020-01", end: "", bullets: ["Built the engine"] }],
      ["Node.js", "Postgres"],
    ),
  );
  await expect(page.getByText("Résumé imported")).toBeVisible();
  await expect(page).toHaveURL((url) => url.searchParams.get("tab") === "edit");

  await pasteResult(
    page,
    llmDocument(
      [
        {
          company,
          role: "Engineer",
          start: "Jan 2020",
          end: "2023-05",
          bullets: ["Built the engine", "Scaled it to millions"],
        },
      ],
      ["NodeJS", "Postgres", "Redis"],
    ),
  );

  const review = page.getByTestId("resume-import-review");
  await expect(review).toBeVisible();
  const experience = review.locator("[data-entry='experiences:0']");
  await expect(experience).toHaveAttribute("data-action", "update");
  await expect(experience).toContainText("2023-05");
  await expect(experience).toContainText("1 already in your library, 1 new");
  const nodeSkill = review.locator("[data-entry='skills:0']");
  await expect(nodeSkill).toContainText("Close match");
  await expect(nodeSkill).toHaveAttribute("data-action", "keep");
  await review.getByTestId("resume-import-apply").click();
  await expect(review).toBeHidden();

  await reloadAfterLocalWrites(page);
  await page.getByRole("tab", { name: "JSON" }).click();
  await expect(page.getByTestId("resume-json-tab")).toBeVisible();
  await page.getByRole("radio", { name: "Raw" }).click();
  const rawJson = await page.getByTestId("resume-json-tab").locator("textarea").inputValue();
  const doc = resumeDocumentV1Schema.parse(JSON.parse(rawJson));

  expect(doc.experience.items).toEqual([
    expect.objectContaining({
      company,
      role: "Engineer",
      start: "2020-01",
      end: "2023-05",
      bullets: ["Built the engine", "Scaled it to millions"],
    }),
  ]);
  expect(doc.skills.groups).toEqual([{ name: "Backend", items: ["Node.js", "Postgres", "Redis"] }]);
});
