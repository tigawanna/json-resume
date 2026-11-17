import { migrationsFolder } from "@repo/db";
import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Every test file gets its own app, db, and auth. By default the database is a
 * throwaway migrated SQLite file; set `TEST_DATABASE_URL` to run against a
 * disposable server database (needed for the concurrent-transaction tests).
 */
process.env.DATABASE_URL ??= "file::memory:";
process.env.DATABASE_AUTH_TOKEN = "";
process.env.BETTER_AUTH_SECRET ??= "vitest-test-secret-at-least-32-characters";
process.env.GITHUB_CLIENT_ID ??= "test-client-id";
process.env.GITHUB_CLIENT_SECRET ??= "test-client-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3100";
process.env.FRONTEND_URL ??= "http://localhost:3040";
// Pin the credit policy so projection tests are deterministic on a clean
// checkout (a fresh clone has CREDITS_* commented out in .env.example). The
// real-event fixture contains résumés created before this instant, so they
// must be grandfathered rather than charged.
process.env.CREDITS_ENABLED ??= "true";
process.env.CREDITS_START_AT ??= "2026-11-16T00:00:00.000Z";

const externalUrl = process.env.TEST_DATABASE_URL;
const databaseDir = externalUrl ? undefined : mkdtempSync(join(tmpdir(), "ajr-api-test-"));
const databaseUrl = externalUrl ?? `file:${join(databaseDir!, "test.sqlite")}`;
process.env.DATABASE_URL = databaseUrl;

const { createDb, setDb } = await import("@api/db/client");
const { createAuth, setAuth } = await import("@api/auth/auth");

const db = createDb({ url: databaseUrl });
await migrate(db, { migrationsFolder });
setDb({ db });
setAuth({ auth: createAuth({ db }) });

process.once("exit", () => {
  db.$client.close();
  if (databaseDir) rmSync(databaseDir, { recursive: true, force: true });
});
