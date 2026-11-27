import { existsSync } from "node:fs";
import { join } from "node:path";

const migrationsFolder = join(import.meta.dirname, "migrations");
const journalPath = join(migrationsFolder, "meta", "_journal.json");

if (!existsSync(journalPath)) {
  throw new Error(`Postgres migration journal not found at ${journalPath}`);
}

export const postgresMigrationsFolder = migrationsFolder;
