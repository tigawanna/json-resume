import {
  createBrowserWASQLitePersistence,
  openBrowserWASQLiteOPFSDatabase,
} from "@tanstack/browser-db-sqlite-persistence";

export const persistedTanstackDBDatabase = await openBrowserWASQLiteOPFSDatabase({
  databaseName: `tanstack-db.sqlite`,
});

export const tanstackDBPersistence = createBrowserWASQLitePersistence({
  database: persistedTanstackDBDatabase,
});
