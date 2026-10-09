import type { Page } from "@playwright/test";
import Database from "better-sqlite3";
import { writeFileSync } from "node:fs";
import { z } from "zod";

/** Must match `databaseName` in `src/data-access-layer/event-sourced/collection.ts`. */
export const BROWSER_DB_NAME = "agentic-json-resume.sqlite";

const registryRowSchema = z.object({ collection_id: z.string(), table_name: z.string() });

/**
 * Copies the app's OPFS SQLite file out of the browser into `filePath`.
 *
 * The OPFS worker holds an exclusive lock on the file while the app is open, so
 * this leaves the app (any same-origin static file will do) before reading.
 * The page is left on that static file; navigate back afterwards if needed.
 *
 * The copy gets one view per collection (`resume`, `outbox`, `inbox`, …) over
 * the hashed `c_*` tables, so it can be read without knowing the hashes.
 */
export async function exportBrowserDb(page: Page, filePath: string) {
  await page.goto("/favicon.svg");
  const base64 = await page.evaluate(async (name) => {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(name);
    for (let attempt = 0; ; attempt++) {
      try {
        const file = await handle.getFile();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
            resolve(dataUrl.split(",")[1] ?? "");
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      } catch (err: unknown) {
        if (attempt >= 20) throw err;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }, BROWSER_DB_NAME);

  writeFileSync(filePath, Buffer.from(base64, "base64"));
  addCollectionViews(filePath);
  return filePath;
}

function addCollectionViews(filePath: string) {
  const sqlite = new Database(filePath);
  try {
    const registry = z
      .array(registryRowSchema)
      .parse(sqlite.prepare("select collection_id, table_name from collection_registry").all());
    for (const { collection_id, table_name } of registry) {
      sqlite.exec(
        `create view if not exists "${collection_id}" as
         select key, value, metadata, row_version from "${table_name}"`,
      );
    }
  } finally {
    sqlite.close();
  }
}

/** Runs a read-only query against a file written by {@link exportBrowserDb}. */
export function queryBrowserDb(filePath: string, sql: string, args: unknown[] = []): unknown[] {
  const sqlite = new Database(filePath, { readonly: true });
  try {
    return sqlite.prepare(sql).all(...args);
  } finally {
    sqlite.close();
  }
}
