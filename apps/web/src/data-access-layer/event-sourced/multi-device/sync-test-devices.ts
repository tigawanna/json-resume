import { createCollection } from "@tanstack/db";
import {
  createNodeSQLitePersistence,
  persistedCollectionOptions,
} from "@tanstack/node-db-sqlite-persistence";
import { createMockSyncBackend, type MockSyncBackend } from "event-sourced-collection";
import { createNodeEventSourcedDB } from "event-sourced-collection/node";
import Database from "better-sqlite3";
import { installStaleReplayGuard } from "../stale-replay-guard";

type SyncCollectionDefs = Record<string, { getKey: (row: never) => string | number }>;

type SyncDevice<TDefs extends SyncCollectionDefs> = ReturnType<
  typeof createNodeEventSourcedDB<TDefs>
>;

/**
 * Several node databases on one in-memory sync log.
 * Sync flags match the browser DB: schema 1, sync on, local echoes not recorded.
 */
export function createSyncDevices<const TDefs extends SyncCollectionDefs>(options: {
  collections: TDefs;
  backendId?: string;
}) {
  const backend: MockSyncBackend = createMockSyncBackend({
    backendId: options.backendId ?? "sync-test",
  });
  const devices: Array<SyncDevice<TDefs>> = [];

  function open(clientId: string) {
    const sqlite = new Database(":memory:");
    const device = createNodeEventSourcedDB({
      clientId,
      schemaVersion: 1,
      eventSchemaVersion: 1,
      syncEnabled: true,
      recordLocalEchoes: false,
      sync: backend,
      collections: options.collections,
      modules: {
        database: sqlite,
        createNodeSQLitePersistence,
        createCollection,
        persistedCollectionOptions,
      },
    });
    const ensure = device.ensureDb.bind(device);
    device.ensureDb = async () => {
      const db = await ensure();
      installStaleReplayGuard(db);
      return db;
    };
    devices.push(device);
    return device;
  }

  async function close() {
    while (devices.length > 0) {
      await devices.pop()?.close();
    }
  }

  return { backend, open, close };
}
