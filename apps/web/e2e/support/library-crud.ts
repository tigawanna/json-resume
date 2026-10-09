import { expect, type Locator, type Page } from "@playwright/test";
import {
  expectToast,
  ROW_SELECTOR,
  waitForLocalDb,
  waitForLocalWrites,
} from "../resume-data/local-db";

type LibraryRoute = {
  path: string;
  /** List test ids are `${slug}-list-page`, `add-${slug}-btn` and `${slug}-table`. */
  slug: string;
  /** Toasts read `${noun} created`, `${noun} saved` and `${noun} deleted`. */
  noun: string;
  createdText: string;
  updatedText: string;
  fillCreate: (dialog: Locator) => Promise<void>;
  /** Should wait for the dialog to show the saved values before typing. */
  fillEdit: (dialog: Locator) => Promise<void>;
};

async function reloadList(page: Page, route: LibraryRoute) {
  await waitForLocalWrites(page);
  await page.reload();
  await openList(page, route);
}

async function openList(page: Page, route: LibraryRoute) {
  await waitForLocalDb(page);
  await expect(page.getByTestId(`${route.slug}-list-page`)).toBeVisible();
}

function card(page: Page, route: LibraryRoute, text: string) {
  return page.getByTestId(`${route.slug}-table`).locator(ROW_SELECTOR).filter({ hasText: text });
}

/** Create, edit and delete one library entry, reloading after each step to prove it persisted. */
export async function expectLibraryCrud(page: Page, route: LibraryRoute) {
  await page.goto(route.path);
  await openList(page, route);

  await page.getByTestId(`add-${route.slug}-btn`).click();
  const createDialog = page.getByRole("dialog");
  await route.fillCreate(createDialog);
  await createDialog.getByRole("button", { name: "Create" }).click();
  await expectToast(page, `${route.noun} created`);
  await expect(createDialog).toBeHidden();
  await expect(card(page, route, route.createdText)).toBeVisible();

  await reloadList(page, route);
  await expect(card(page, route, route.createdText)).toBeVisible();

  await card(page, route, route.createdText).getByTestId("row-edit-btn").click();
  const editDialog = page.getByRole("dialog");
  await route.fillEdit(editDialog);
  await editDialog.getByRole("button", { name: "Save" }).click();
  await expectToast(page, `${route.noun} saved`);
  await expect(editDialog).toBeHidden();
  await expect(card(page, route, route.updatedText)).toBeVisible();

  await reloadList(page, route);
  const updated = card(page, route, route.updatedText);
  await expect(updated).toBeVisible();

  await updated.getByTestId("row-delete-btn").click();
  await expectToast(page, `${route.noun} deleted`);
  await expect(updated).toBeHidden();

  await reloadList(page, route);
  await expect(card(page, route, route.updatedText)).toBeHidden();
}

/** Form labels aren't linked to their inputs, so find the input that follows the label text. */
export function inputAfterLabel(dialog: Locator, label: string) {
  return dialog.getByText(label, { exact: true }).locator("xpath=following-sibling::input[1]");
}

/** Picks an option from a "Select or type…" combobox inside `dialog`. */
export async function pickComboboxOption(dialog: Locator, index: number, option: string) {
  const input = dialog.getByPlaceholder("Select or type…").nth(index);
  await input.click();
  await input.fill(option);
  await dialog.page().getByRole("option", { name: option, exact: true }).click();
  await expect(input).toHaveValue(option);
}
