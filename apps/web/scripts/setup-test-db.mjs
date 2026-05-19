import { createClient } from "@libsql/client";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = fileURLToPath(new URL("../", import.meta.url));
const defaultDatabasePath = join(appDir, ".test", "db", "e2e.sqlite");
const databaseUrl = process.env.DATABASE_URL ?? `file:${defaultDatabasePath}`;
const resetDatabase = process.env.TEST_DB_RESET !== "false";

function toFilePath(url) {
  if (!url.startsWith("file:")) {
    throw new Error(`setup-test-db only supports file: DATABASE_URL values. Received: ${url}`);
  }

  const rawPath = url.slice("file:".length);
  return isAbsolute(rawPath) ? rawPath : join(appDir, rawPath);
}

function readMigrationStatements() {
  const migrationDir = join(appDir, "drizzle", "migrations");
  return readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .flatMap((file) => {
      const migration = readFileSync(join(migrationDir, file), "utf8");
      return migration
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);
    });
}

const databasePath = toFilePath(databaseUrl);
mkdirSync(dirname(databasePath), { recursive: true });

if (resetDatabase && existsSync(databasePath)) {
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
}

const client = createClient({ url: databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN ?? "" });

try {
  for (const statement of readMigrationStatements()) {
    await client.execute(statement);
  }
  console.log(`Prepared test database at ${databasePath}`);
} finally {
  client.close();
}
