import { openTestAppDb } from "@/data-access-layer/event-sourced/testing/app-test-db";
import {
  seedHistory,
  type SeedHistoryOptions,
} from "@/data-access-layer/event-sourced/testing/seed-history/seed-history";

/** Opens an in-memory app database and writes a résumé history into the outbox. */
export async function openSeededLibrary(options: SeedHistoryOptions = { resumes: 1 }) {
  const handle = openTestAppDb();
  const db = await handle.ensureDb();
  const seeded = await seedHistory(db, options);
  return { db, seeded, close: () => handle.close() };
}
