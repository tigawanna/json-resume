import { execFileSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, "..");
const rootDir = resolve(appDir, "../..");

function testDatabaseUrl() {
  const output = execFileSync("pgboxdb", ["run", "--json"], {
    cwd: rootDir,
    encoding: "utf8",
    env: { ...process.env, PGBOXDB_PORT: process.env.PGBOXDB_PORT ?? "55430" },
  });
  const parsed: unknown = JSON.parse(output);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("url" in parsed) ||
    typeof parsed.url !== "string"
  ) {
    throw new Error("pgboxdb run did not return a connection URL");
  }
  return parsed.url;
}

const args = process.argv.slice(2).filter((arg) => arg !== "--");
if (!process.env.NEST_TEST_POSTGRES_SOURCE && args.length === 0) {
  args.push("--exclude", "test/admin-real-data-*");
}

const result = spawnSync(
  "pnpm",
  ["exec", "vitest", "run", "--config", "./vitest.config.e2e.ts", ...args],
  {
    cwd: appDir,
    stdio: "inherit",
    env: { ...process.env, NEST_TEST_POSTGRES_URL: testDatabaseUrl() },
  },
);
process.exit(result.status ?? 1);
