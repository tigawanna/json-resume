/* In-memory node database with every app collection, for tests needing a real AppDb. */
import { createCollection } from "@tanstack/db";
import {
  createNodeSQLitePersistence,
  persistedCollectionOptions,
} from "@tanstack/node-db-sqlite-persistence";
import { createMockSyncBackend } from "event-sourced-collection";
import { createNodeEventSourcedDB } from "event-sourced-collection/node";
import Database from "better-sqlite3";
import { appCollectionConfigs, type AppCollectionDefs, type AppDb } from "../collection";

/** Every app collection on an in-memory node database, for tests that need a real `AppDb`. */
export function openTestAppDb() {
  const device = createNodeEventSourcedDB<AppCollectionDefs>({
    clientId: "test-device",
    schemaVersion: 1,
    eventSchemaVersion: 1,
    syncEnabled: false,
    recordLocalEchoes: false,
    sync: createMockSyncBackend({ backendId: "app-test" }),
    collections: appCollectionConfigs,
    modules: {
      database: new Database(":memory:"),
      createNodeSQLitePersistence,
      createCollection,
      persistedCollectionOptions,
    },
  });
  return {
    ensureDb: (): Promise<AppDb> => device.ensureDb(),
    close: () => device.close(),
  };
}
