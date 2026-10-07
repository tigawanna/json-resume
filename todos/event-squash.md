# Event squash + undo

Goal: stop the event log growing forever, give each résumé a dedicated events
view, and let a user roll a résumé back to any recorded event.

## Facts this design relies on

Checked against `event-sourced-collection` (ARCHITECTURE.md + dist):

- Update payloads are the **full modified row** (`mutation.modified`), deletes
  carry the full deleted row, and update/delete carry `previous`.
- Replay is an **idempotent upsert by primary key** (`acceptMutations`), so an
  update for a key that was never inserted materialises the row.
- Devices **do not replay** their local log on boot; state collections are
  persisted. Full replay only happens when a fresh/reset device pulls the server
  log from seq 0.
- `pruneSyncedEvents` writes the pull cursor before deleting so a pruned inbox
  can't rewind the cursor (cursor falls back to max inbox `globalSeq`).

## Squash rule (one rule, both cases)

For every row (`collectionId` + `key`), the **latest event is the truth**:

- latest is insert/update → its payload is the whole row, every earlier event is
  dead weight ("collapse updates");
- latest is delete → it stays as a tombstone so devices still holding the row
  drop it; every earlier event is dead weight ("squash deletes").

An event is removed only when it is superseded **and** older than the retention
cutoff (default 24h), so recent history stays available for undo.

Never removed: the latest event of a row, reset markers (`__sync_reset__`),
pending outbox events, unresolved/skipped inbox events, unprojected server
events.

Known trade-offs:

- Undo can only reach back as far as the retained history.
- Server rows survive at their _latest_ seq, so a fresh device may replay a child
  before its parent. Client collections have no FKs, so this is harmless; server
  projection only ever sees already-projected events removed.
- Tombstones are kept forever (dropping them could leave ghost rows on a device
  that has been offline since before the delete).

## Phases

### 1. Shared planner — `apps/web/src/modules/sync/squash-plan.ts`

- [x] `planSquash(events, { before })` → events to remove + counts by reason
- [x] `planRestore(events, targetId)` → per-row target state (+ rows with no earlier state)
- [x] unit tests (`squash-plan.test.ts`, 11 passing)

### 2. Server pruning (`sync_event`)

- [x] `squashSyncEvents({ userId?, retentionMs? })` in `modules/sync/squash.server.ts`
      — projects first, loads metadata only, plans per user, deletes by `global_seq`
      in chunks. Retention is floored at 1 hour (`MIN_SERVER_RETENTION_MS`): push
      dedupes on `event_id`, so a late retry of a squashed event would be re-stored
      as the row's newest state.
- [x] admin "Squash" dialog on `/admin/tables/sync_event` (`squashEventLogFn`)
- [x] `/admin/data` → Actions drawer: projection catch-up, squash (dry-run preview, per
      user or all), merge duplicate library rows (per user or all), rebuild (per user
      or all), back up & empty + backup restore/drop
- [x] `GET|POST /api/cron/squash-sync-events` (`Authorization: Bearer $CRON_SECRET`)
- [x] scheduled nightly in `apps/web/vercel.json` (03:30, after projection at 03:00)
- [ ] run once against the real DB (take a `sync_event` backup first) and check counts

### 3. Local pruning (device outbox + inbox)

- [x] `squashLocalEvents(db, events, before)` in
      `data-access-layer/event-sourced/event-history.ts` — persists the pull cursor
      first, deletes only synced outbox / resolved inbox rows, never the newest inbox row
- [x] runs after every successful managed sync (24h retention), replacing the old
      `pruneSyncedEvents({ keepLast: 50 })`; synced events older than 7 days are
      still pruned so the device log stays bounded
- [ ] browser check of squash with real synced events (only unit-tested so far)

### 4. Per-résumé events view — `/resumes/$resumeId/events`

- [x] full timeline (résumé row, rows scoped to it, library rows it links to now or
      linked to in its history), changed-field labels, before/after payloads
- [x] squash preview + "Squash on this device" with retention choice; squashable
      events are dimmed in the timeline
- [x] link from the actions drawer history section

### 5. Undo

- [x] "Restore to here": every row touched after the event goes back to its state
      at that event, validated against the collection's zod schema and written as
      normal mutations with a fresh `updatedAt` (so other devices' stale-replay guard
      accepts them)
- [x] confirm dialog: rows changed/removed, shared library entries, rows with no
      earlier state; timeline marks events that will be undone
- [x] browser verification: update rollback and insert removal both worked

### Later

- [ ] drop very old tombstones once every device is known to be past them
- [ ] undo for library entries from their own pages (same `restoreToEvent`, different filter)
