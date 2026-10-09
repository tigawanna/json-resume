import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectToast, reloadAfterLocalWrites, waitForLocalDb } from "./resume-data/local-db";
import { signUp } from "./support/auth";
import { addGitHubAccountForUser } from "./support/github";

const agenticRepoUrl = "https://github.com/playwright-user/agentic-json-resume";

test("searches and shortlists GitHub repositories", async ({ page }) => {
  const { email } = await signUp(page);
  await addGitHubAccountForUser(email);

  await page.goto("/repos");
  await waitForLocalDb(page);
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
  await expect(saveButton).toHaveText("Save");
  await saveButton.click();
  await expectToast(page, "Project saved");
  await expect(saveButton).toHaveText("Unsave");
  await expect.poll(() => savedProjectCount(page, agenticRepoUrl)).toBe(1);

  await reloadAfterLocalWrites(page);
  await expect(page.getByTestId("github-repos-page")).toBeVisible();
  const savedAgenticCard = repoCard(page, "agentic-json-resume");
  await expect(savedAgenticCard.getByTestId("repo-save-toggle")).toHaveText("Unsave");

  await savedAgenticCard.getByTestId("repo-save-toggle").click();
  await expectToast(page, "Project removed");
  await expect.poll(() => savedProjectCount(page, agenticRepoUrl)).toBe(0);

  await reloadAfterLocalWrites(page);
  await expect(page.getByTestId("github-repos-page")).toBeVisible();
  await expect(repoCard(page, "agentic-json-resume").getByTestId("repo-save-toggle")).toHaveText(
    "Save",
  );
});

function repoCard(page: Page, name: string): Locator {
  return page.locator("[data-test='repo-card']").filter({ hasText: name });
}

/** Saved repos become local `resumeProject` rows keyed by URL. */
function savedProjectCount(page: Page, url: string) {
  return page.evaluate((target) => {
    const db = window.__e2eEventSourcedDb;
    if (!db) throw new Error("Local event-sourced DB is not ready");
    return db.collections.resumeProject.toArray.filter((row) => row.url === target).length;
  }, url);
}
