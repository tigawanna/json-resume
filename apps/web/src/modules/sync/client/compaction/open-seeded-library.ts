import { openTestAppDb } from "@/data-access-layer/event-sourced/testing/app-test-db";
import {
  seedLibrary,
  type SeedLibraryOptions,
} from "@/data-access-layer/event-sourced/testing/seed-library";

/** Opens an in-memory app database and seeds the library for compaction tests. */
export async function openSeededLibrary(options: SeedLibraryOptions = {}) {
  const handle = openTestAppDb();
  const db = await handle.ensureDb();
  seedLibrary(db, options);
  return { db, close: () => handle.close() };
}
