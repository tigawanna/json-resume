import { createClient, type Client } from "@libsql/client";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";

export type TestDatabase = {
  databasePath: string;
  databaseUrl: string;
  tempDir: string;
  cleanup: () => void;
};

export async function runDrizzleMigrations(client: Client): Promise<void> {
  const migrationDir = new URL("../../drizzle/migrations/", import.meta.url);
  const migrationFiles = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const migration = readFileSync(new URL(file, migrationDir), "utf8");
    const statements = migration
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    for (const statement of statements) {
      await client.execute(statement);
    }
  }
}

export async function createMigratedTestDatabase(prefix = "ajr-test-"): Promise<TestDatabase> {
  const tempDir = await mkdtemp(join(tmpdir(), prefix));
  const databasePath = join(tempDir, "test.sqlite");
  const databaseUrl = `file:${databasePath}`;
  const client = createClient({ url: databaseUrl });

  try {
    await runDrizzleMigrations(client);
  } finally {
    client.close();
  }

  return {
    databasePath,
    databaseUrl,
    tempDir,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
  };
}

export function stubTestServerEnv(databaseUrl: string, frontendUrl = "http://127.0.0.1:3040") {
  vi.stubEnv("DATABASE_URL", databaseUrl);
  vi.stubEnv("DATABASE_AUTH_TOKEN", "");
  vi.stubEnv("BETTER_AUTH_SECRET", "vitest-test-secret-at-least-32-characters");
  vi.stubEnv("GITHUB_CLIENT_ID", "test-client-id");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("FRONTEND_URL", frontendUrl);
  vi.stubEnv("VITE_API_URL", frontendUrl);
}
