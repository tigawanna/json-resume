import { test as base } from "@playwright/test";
import { unwrapUnknownError } from "@/utils/errors";
import { writeFileSync } from "node:fs";
import { signUp } from "./auth";
import { exportBrowserDb } from "./browser-db";
import { getUserIdByEmail, serverDatabaseUrl, snapshotServerDb } from "./database";

export { expect } from "@playwright/test";

type Account = Awaited<ReturnType<typeof signUp>> & { userId: string };

export const BROWSER_DB_FILE = "browser.sqlite";
export const SERVER_DB_FILE = "server.json";

/**
 * `account` signs a fresh user up in the test's browser context. When the test
 * ends (pass or fail) its output folder gets real SQLite copies of both sides
 * of sync, plus `artifacts.json` describing them:
 *
 * - `browser.sqlite` — this browser's OPFS database (collections, outbox, inbox)
 * - `server.json` — Nest/Postgres diagnostics (`sync_event` + projected rows)
 */
export const test = base.extend<{ account: Account }>({
  account: async ({ page }, use, testInfo) => {
    const credentials = await signUp(page);
    const account = { ...credentials, userId: await getUserIdByEmail(credentials.email) };

    await use(account);

    const browserDb = testInfo.outputPath(BROWSER_DB_FILE);
    const serverDb = testInfo.outputPath(SERVER_DB_FILE);
    const errors: string[] = [];
    await exportBrowserDb(page, browserDb).catch((err: unknown) => {
      errors.push(`browser.sqlite: ${unwrapUnknownError(err).message}`);
    });
    await snapshotServerDb({ filePath: serverDb, userId: account.userId }).catch((err: unknown) => {
      errors.push(`server.json: ${unwrapUnknownError(err).message}`);
    });

    const manifest = {
      test: testInfo.titlePath.join(" › "),
      status: testInfo.status,
      userId: account.userId,
      email: account.email,
      browserDb,
      serverDb,
      liveServerDb: serverDatabaseUrl,
      errors,
      howToRead: {
        browserDb: [
          "One view per collection: resume, resumeExperience, …, outbox, inbox, deadletter, settings.",
          "Columns: key, value (JSON row), metadata, row_version.",
          "select key, json_extract(value, '$.headline') from resume;",
          "select json_extract(value, '$.collectionId'), json_extract(value, '$.type'), json_extract(value, '$.syncStatus') from outbox order by json_extract(value, '$.localSeq');",
        ],
        serverDb: [
          "Postgres diagnostics for this test user.",
          "events is the sync_event log; projectedResumes contains the server-side resume rows.",
          "Filter events by collection_id and inspect payload/previous JSON.",
        ],
      },
    };
    writeFileSync(testInfo.outputPath("artifacts.json"), JSON.stringify(manifest, null, 2));
    await testInfo.attach("artifacts.json", { path: testInfo.outputPath("artifacts.json") });
  },
});
