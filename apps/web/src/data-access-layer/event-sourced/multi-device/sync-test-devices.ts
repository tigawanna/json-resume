import { createCollection } from "@tanstack/db";
import {
  createNodeSQLitePersistence,
  persistedCollectionOptions,
} from "@tanstack/node-db-sqlite-persistence";
import { createMockSyncBackend, type MockSyncBackend } from "event-sourced-collection";
import { createNodeEventSourcedDB } from "event-sourced-collection/node";
import Database from "better-sqlite3";
import {
  COMPACTION_CLIENT_ID,
  compactionEvents,
  type CompactionProposal,
} from "@/modules/sync/compaction-protocol";
import { installStaleReplayGuard } from "../stale-replay-guard";
import { createSyncCompaction, type ProposeCompaction } from "../sync-compaction";

type SyncCollectionDefs = Record<string, { getKey: (row: never) => string | number }>;

type SyncDevice<TDefs extends SyncCollectionDefs> = ReturnType<
  typeof createNodeEventSourcedDB<TDefs>
>;

/** The server's accept-or-stale rule, against the in-memory log. */
export function acceptCompactionOn(backend: MockSyncBackend): ProposeCompaction {
  return async (proposal: CompactionProposal) => {
    if (backend.events.some((event) => event.globalSeq > proposal.baseSeq)) {
      return { status: "stale" };
    }
    const events = compactionEvents(proposal);
    for (const event of events) {
      backend.seed({
        eventId: event.eventId,
        collectionId: event.collectionId,
        type: event.type,
        key: event.key,
        payload: event.payload,
        clientId: COMPACTION_CLIENT_ID,
      });
    }
    return { status: "accepted", events: events.length };
  };
}

/**
 * Several node databases on one in-memory sync log.
 * Sync flags match the browser DB: schema 1, sync on, local echoes not recorded.
 * Each device plans library compaction the way the browser does; call
 * `device.compaction.afterSync(db, result)` after a sync to run it.
 */
export function createSyncDevices<const TDefs extends SyncCollectionDefs>(options: {
  collections: TDefs;
  backendId?: string;
  now?: () => number;
}) {
  const backend: MockSyncBackend = createMockSyncBackend({
    backendId: options.backendId ?? "sync-test",
  });
  const devices: Array<SyncDevice<TDefs>> = [];

  function open(clientId: string) {
    const sqlite = new Database(":memory:");
    const compaction = createSyncCompaction({
      propose: acceptCompactionOn(backend),
      now: options.now,
      minIntervalMs: 0,
    });
    const device = createNodeEventSourcedDB({
      clientId,
      schemaVersion: 1,
      eventSchemaVersion: 1,
      syncEnabled: true,
      recordLocalEchoes: false,
      sync: compaction.wrapTransport(backend),
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
      compaction.install(db);
      return db;
    };
    devices.push(device);
    return Object.assign(device, { compaction });
  }

  async function close() {
    while (devices.length > 0) {
      await devices.pop()?.close();
    }
  }

  return { backend, open, close };
}
