# Sync

One module, three sides. Shared planners have no I/O. `server/` talks to the event log. `client/` runs in the browser against the local event-sourced database.

```
sync/
├── shared/                 # planners both sides call
├── server/                 # the user's event log on the server
│   └── compaction/         # append a device's compaction proposal
└── client/                 # this device's sync against that log
    └── compaction/         # plan a proposal after this device syncs
```

## `shared/` — planners (no server, no browser)

| File                       | Entrypoint                | Purpose                                                                                                        |
| -------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `squash-plan.ts`           | `planSquash`              | Which log events a newer event for the same row supersedes. `planRestore` inverts one.                         |
| `compact-plan.ts`          | `planCompaction`          | Which unreferenced or duplicate library rows become compaction ops.                                            |
| `compaction-protocol.ts`   | `compactionEvents`        | Proposal schema and the accept-or-stale rule: the server appends only if the log has not moved past `baseSeq`. |
| `projection-constraint.ts` | `uniqueConstraintColumns` | Parses SQLite unique and foreign-key errors from projection writes.                                            |
| `sync-reset.ts`            | `userBackendId`           | Marker that makes devices resync from zero after a log rebuild.                                                |

## `server/` — event log

| File                           | Entrypoint                         | Called from                                                     |
| ------------------------------ | ---------------------------------- | --------------------------------------------------------------- |
| `sync-events.server.ts`        | `pushSyncEvents`, `pullSyncEvents` | `routes/api/sync/events.ts`                                     |
| `squash.server.ts`             | `squashSyncEvents`                 | admin actions, `routes/api/cron/squash-sync-events.ts`          |
| `squash-incremental.server.ts` | `squashUserLogsIncrementally`      | `squash.server.ts`                                              |
| `project-legacy.server.ts`     | `projectUnappliedSyncEvents`       | `routes/api/cron/project-sync-events.ts`, after push and squash |

### `server/compaction/`

| File                   | Entrypoint        | Called from                                                   |
| ---------------------- | ----------------- | ------------------------------------------------------------- |
| `compaction.server.ts` | `compactOnServer` | `routes/api/sync/compact.ts`, admin compact and prune actions |

The device proposes. The server appends the ops when the log still ends at `baseSeq`. A later proposal comes back stale.

## `client/` — this device

Lives next to the server code so the pair is visible. The browser database in `data-access-layer/event-sourced/collection.ts` wires these in.

| File                    | Entrypoint                  | Purpose                                                           |
| ----------------------- | --------------------------- | ----------------------------------------------------------------- |
| `sync-transport.ts`     | `createCookieSyncTransport` | Push and pull over `/api/sync/events`.                            |
| `sync-progress.ts`      | `useSyncTransferProgress`   | Upload and download counters for the sync UI.                     |
| `sync-push-tuning.ts`   | `installSyncPushTuning`     | Shrinks the push batch after HTTP 413. Stored on the device only. |
| `stale-replay-guard.ts` | `installStaleReplayGuard`   | Drops a replayed event when the local row is newer.               |
| `use-sync-status.ts`    | `useEventSourcedSyncStatus` | Live sync status for the open database.                           |

### `client/compaction/`

| File                 | Entrypoint        | Purpose                                      |
| -------------------- | ----------------- | -------------------------------------------- |
| `sync-compaction.ts` | `compactOnClient` | Called after a successful sync. Blank shell. |
