import { expect, type Page } from "@playwright/test";

export const LIBRARY_SEED_COUNT = 100;
export const PAGE_SIZE = 20;

type InsertableCollection =
  | "resumeExperience"
  | "resumeEducation"
  | "resumeProject"
  | "job"
  | "resume";

type SeedRow = Record<string, unknown>;

type E2eSeedDb = {
  collections: Record<InsertableCollection, { insert: (row: SeedRow) => void }>;
};

export async function waitForLocalDb(page: Page) {
  await page.waitForFunction(() => Boolean(window.__e2eEventSourcedDb), null, {
    timeout: 60_000,
  });
}

/**
 * Local writes are optimistic: the UI (and its toast) updates before the row reaches OPFS.
 * Call before `page.reload()` or navigating away, or the write can be lost.
 * Passes straight away on a page where the DB hasn't loaded, since nothing can be pending.
 */
export async function waitForLocalWrites(page: Page) {
  await page.waitForFunction(
    () => {
      const db = window.__e2eEventSourcedDb;
      if (!db) return true;
      return Object.values(db.collections).every((collection) =>
        [...collection._state.transactions.values()].every(
          (tx) => tx.state === "completed" || tx.state === "failed",
        ),
      );
    },
    null,
    { timeout: 10_000 },
  );
}

export async function reloadAfterLocalWrites(page: Page) {
  await waitForLocalWrites(page);
  await page.reload();
  await waitForLocalDb(page);
}

export async function seedCollection(
  page: Page,
  collection: InsertableCollection,
  rows: SeedRow[],
) {
  await waitForLocalDb(page);
  await page.evaluate(
    ({ collectionName, payload }) => {
      const db = window.__e2eEventSourcedDb as E2eSeedDb | undefined;
      if (!db) throw new Error("Local event-sourced DB is not ready");
      for (const row of payload) {
        db.collections[collectionName].insert(row);
      }
    },
    { collectionName: collection, payload: rows },
  );
}

function pad(index: number) {
  return String(index).padStart(3, "0");
}

function timestamps(index: number) {
  const createdAt = 1_700_000_000_000 + index;
  return { createdAt, updatedAt: createdAt };
}

export function experienceSeedRows(prefix: string, count = LIBRARY_SEED_COUNT) {
  return Array.from({ length: count }, (_, i) => {
    const n = pad(i);
    const role = i === 0 ? `${prefix} Needle Role` : `${prefix} Role ${n}`;
    const company = i === 0 ? `${prefix} Needle Co` : `${prefix} Co ${n}`;
    return {
      id: `${prefix}-exp-${n}`,
      company,
      role,
      startDate: "2020-01",
      endDate: i % 7 === 0 ? "Present" : "2024-12",
      location: i % 2 === 0 ? "Remote" : "Nairobi",
      sortOrder: i,
      userId: null,
      searchableText: `${role} ${company}`,
      embedding: null,
      embeddingModel: null,
      ...timestamps(i),
    };
  });
}

export function educationSeedRows(prefix: string, count = LIBRARY_SEED_COUNT) {
  return Array.from({ length: count }, (_, i) => {
    const n = pad(i);
    const school = i === 0 ? `${prefix} Needle University` : `${prefix} University ${n}`;
    const degree = `BSc ${n}`;
    return {
      id: `${prefix}-edu-${n}`,
      school,
      degree,
      field: "Computer Science",
      startDate: "2014-01",
      endDate: "2018-12",
      description: `${prefix} education ${n}`,
      sortOrder: i,
      userId: null,
      searchableText: `${school} ${degree}`,
      embedding: null,
      embeddingModel: null,
      ...timestamps(i),
    };
  });
}

export function projectSeedRows(prefix: string, count = LIBRARY_SEED_COUNT) {
  return Array.from({ length: count }, (_, i) => {
    const n = pad(i);
    const name = i === 0 ? `${prefix} Needle Project` : `${prefix} Project ${n}`;
    return {
      id: `${prefix}-proj-${n}`,
      name,
      url: `https://github.com/example/${prefix}-${n}`,
      homepageUrl: `https://example.com/${prefix}-${n}`,
      description: `${prefix} project ${n}`,
      tech: '["TypeScript","React"]',
      sortOrder: i,
      userId: null,
      searchableText: name,
      embedding: null,
      embeddingModel: null,
      ...timestamps(i),
    };
  });
}

export function jobSeedRows(prefix: string, count = LIBRARY_SEED_COUNT) {
  return Array.from({ length: count }, (_, i) => {
    const n = pad(i);
    const company = i === 0 ? `${prefix} Needle Labs` : `${prefix} Labs ${n}`;
    return {
      id: `${prefix}-job-${n}`,
      userId: null,
      company,
      title: `Frontend Engineer ${n}`,
      description: `${prefix} posting ${n}`,
      url: "",
      location: "Remote",
      status: "saved",
      notes: "",
      appliedAt: null,
      searchableText: `${company} Frontend Engineer ${n}`,
      embedding: null,
      embeddingModel: null,
      ...timestamps(i),
    };
  });
}

export async function openSeededList(page: Page, path: string, pageTestId: string) {
  await page.goto(path);
  await waitForLocalDb(page);
  await expect(page.getByTestId(pageTestId)).toBeVisible();
}

export async function expectPagination(page: Page, current: number, total: number) {
  await expect(page.getByTestId("list-pagination")).toContainText(`Page ${current} of ${total}`);
}

/** Items are `row-<id>`; their action buttons are `row-*-btn`. */
export const ROW_SELECTOR = '[data-test^="row-"]:not([data-test$="-btn"])';

export async function expectDesktopRowCount(page: Page, tableTestId: string, count: number) {
  await expect(page.getByTestId(tableTestId).locator(ROW_SELECTOR)).toHaveCount(count);
}

/** Clicks the action on the row containing `rowText`, so stale search results can't be hit. */
export async function clickTableRowAction(
  page: Page,
  tableTestId: string,
  action: "edit" | "delete",
  rowText: string,
) {
  const testId = action === "edit" ? "row-edit-btn" : "row-delete-btn";
  const row = page.getByTestId(tableTestId).locator(ROW_SELECTOR).filter({ hasText: rowText });
  await expect(row).toHaveCount(1);
  await row.getByTestId(testId).evaluate((el: HTMLButtonElement) => {
    el.click();
  });
}

export async function goToNextPage(page: Page, expectedPage: number) {
  await page.getByTestId("pagination-next").evaluate((el: HTMLButtonElement) => el.click());
  await expect(page).toHaveURL(new RegExp(`[?&]page=${expectedPage}(?:&|$)`));
}

export async function searchList(page: Page, query: string) {
  const input = page.getByTestId("list-search-input");
  await input.fill(query);
  if (query.trim()) {
    await expect(page).toHaveURL(/[?&]q=/);
  } else {
    await expect(page).not.toHaveURL(/[?&]q=/);
  }
}

export async function submitDialog(page: Page, buttonName: string | RegExp) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: buttonName })
    .evaluate((el: HTMLButtonElement) => el.click());
}

export async function expectToast(page: Page, message: string) {
  await expect(page.getByText(message).last()).toBeVisible();
}
