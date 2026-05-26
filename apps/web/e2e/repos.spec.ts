import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUp } from "./support/auth";
import { addGitHubAccountForUser, getSavedProjectCount } from "./support/github";

const agenticRepoUrl = "https://github.com/playwright-user/agentic-json-resume";

test.setTimeout(90_000);

test("searches and shortlists GitHub repositories", async ({ page }) => {
  const { email } = await signUp(page);
  const { userId } = await addGitHubAccountForUser(email);

  await page.goto("/repos", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("github-repos-page")).toBeVisible();
  await expect(repoCard(page, "agentic-json-resume")).toBeVisible();
  await expect(repoCard(page, "legacy-portfolio")).toBeHidden();

  await page.getByTestId("repo-query").fill("user:{you} portfolio archived:true");
  await expect(repoCard(page, "legacy-portfolio")).toBeVisible();
  await expect(repoCard(page, "agentic-json-resume")).toBeHidden();

  await page.getByTestId("repo-query").fill("user:{you} archived:false");
  const agenticCard = repoCard(page, "agentic-json-resume");
  await expect(agenticCard).toBeVisible();
  await expect(agenticCard.getByText("Resume automation workspace")).toBeVisible();
  await expect(agenticCard.getByText("TypeScript").first()).toBeVisible();
  await expect(agenticCard.getByText("resume", { exact: true })).toBeVisible();

  const saveButton = agenticCard.getByTestId("repo-save-toggle");
  await expect(saveButton).toContainText("Save");
  await saveButton.click();
  await expectToast(page, "Project saved");
  await expect.poll(() => getSavedProjectCount(userId, agenticRepoUrl)).toBe(1);
  await expect(saveButton).toContainText("Saved");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("github-repos-page")).toBeVisible();
  const savedAgenticCard = repoCard(page, "agentic-json-resume");
  await expect(savedAgenticCard.getByTestId("repo-save-toggle")).toContainText("Saved");

  await savedAgenticCard.getByTestId("repo-save-toggle").click();
  await expectToast(page, "Project removed");
  await expect.poll(() => getSavedProjectCount(userId, agenticRepoUrl)).toBe(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("github-repos-page")).toBeVisible();
  await expect(repoCard(page, "agentic-json-resume").getByTestId("repo-save-toggle")).toContainText(
    "Save",
  );
});

function repoCard(page: Page, name: string): Locator {
  return page.locator("[data-test='repo-card']").filter({ hasText: name });
}

async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
