import { expect, type Locator, type Page } from "@playwright/test";

type EditorSection =
  | "Contacts"
  | "Links"
  | "Summary"
  | "Experience"
  | "Education"
  | "Projects"
  | "Skills"
  | "Talks";

/**
 * Section headers toggle, and their open state can settle after a tab switch,
 * so only click while collapsed and retry until the content shows.
 */
export async function openEditorSection(page: Page, section: EditorSection, testId: string) {
  const content = page.getByTestId(testId);
  const header = page.getByRole("button", { name: section, exact: true });
  await expect(async () => {
    if ((await header.getAttribute("aria-expanded")) !== "true") await header.click();
    await expect(content).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return content;
}

export async function expectInputValue(container: Locator, value: string) {
  await expect.poll(() => fieldValues(container)).toContain(value);
}

export async function expectNoInputValue(container: Locator, value: string) {
  await expect.poll(() => fieldValues(container)).not.toContain(value);
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
