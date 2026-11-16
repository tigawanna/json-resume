import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/libsql/node";
import { migrate } from "drizzle-orm/libsql/migrator";
import { migrationsFolder } from "@repo/db";

/**
 * Every test file gets its own throwaway migrated SQLite database, so tests
 * never read or write the configured Turso database. The migration connection
 * is closed before the app imports its own client, leaving a single writer.
 */
const databaseDir = mkdtempSync(join(tmpdir(), "ajr-api-test-"));
process.once("exit", () => rmSync(databaseDir, { recursive: true, force: true }));

process.env.DATABASE_URL = `file:${join(databaseDir, "test.sqlite")}`;
process.env.DATABASE_AUTH_TOKEN = "";
process.env.BETTER_AUTH_SECRET ??= "vitest-test-secret-at-least-32-characters";
process.env.GITHUB_CLIENT_ID ??= "test-client-id";
process.env.GITHUB_CLIENT_SECRET ??= "test-client-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3100";
process.env.FRONTEND_URL ??= "http://localhost:3040";

const migrationDb = drizzle({ connection: { url: process.env.DATABASE_URL } });
await migrate(migrationDb, { migrationsFolder });
migrationDb.$client.close();
