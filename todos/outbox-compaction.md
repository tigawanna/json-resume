# Device-driven compaction (outbox + policy)

Follow-up to `todos/compaction.md`. Library merge compaction already runs on devices
(`data-access-layer/event-sourced/sync-compaction.ts`, server only accepts or reports
stale via `/api/sync/compact`). This plan covers the rest: devices compact their own
**unsent** events before pushing so an offline device does not flood the server, no
admin step is required, and the server's only job is data integrity.

---

## Goals

- A device that was offline and made 1,000 edits pushes roughly one event per row it touched.
- No admin action is needed for any compaction. Admins only tune the retention window.
- The server never plans compaction. It enforces integrity: idempotent pushes, accept-or-stale
  for library merges, a squash that only removes provably superseded events, and a flood cap.
- Retention is per user: a global default (7 days) with per-user overrides (premium users get more history).

## Non-goals

- Changing how synced history is squashed on the server (it stays a cron job; only the window changes).
- Merging edits from different devices (still last-write-wins on `updatedAt`).
- Rebase or undo of events that already reached the server.

---

## Decisions (agreed)

| Question                                      | Decision                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| What does the 100-event trigger compact?      | Every never-sent event, regardless of age.                                      |
| Who squashes the synced server log?           | The server cron, using each user's window.                                      |
| How is pruning unused library rows triggered? | A user action in settings, run on that device.                                  |
| Where does the per-user window come from?     | A `sync_policy` table: global default plus per-user overrides edited by admins. |

---

## Current state (as of this plan)

- `modules/sync/squash-plan.ts`: shared "latest event per row wins" rule, `DEFAULT_RETENTION_MS` = 24h.
- `modules/sync/squash-incremental.server.ts` + `routes/api/cron/squash-sync-events.ts`: server cron
  squash with the fixed 24h window, tracked in `sync_squash_state`.
- `data-access-layer/event-sourced/event-history.ts` `squashLocalEvents`: device squash of **synced**
  outbox/inbox rows past the window, run from `runManagedSync`.
- `app-settings.ts` `LOCAL_EVENT_HORIZON_MS` (7 days): synced events past this leave the device.
- Nothing compacts **unsent** outbox events. They are pushed one by one.
- Users only have `role`; there are no tiers.
- Library merge compaction: client-planned, server accept-or-stale (`compaction-protocol.ts`,
  `compaction.server.ts`). Admin request markers (`__compaction_request__`) and the two admin buttons
  still exist and are to be removed.

---

## Trigger

Run outbox compaction right before a sync when **either** holds:

1. The outbox has **≥ 100 never-sent events** (`OUTBOX_COMPACT_MIN_EVENTS`, constant on the device).
2. Any never-sent event is **older than the user's window** (`timestamp < now - windowMs`).

When it fires, every never-sent event is eligible (decision above). Below the threshold and inside the
window nothing is touched, so recent edits keep full local history for restore and undo.

---

## Eligibility: the integrity rule

Only events that **cannot have reached the server** are compacted:

- `sync === false`
- `attemptCount === 0` (never sent; a sent event whose response was lost may already be stored)
- `syncStatus === "pending"` (not `failed`; failed ones were attempted anyway)
- not in `deadletter`
- not a `localOnly` collection (those never sync; leave them alone)

Per row (`collectionId` + `key`), compaction only covers the **unsent tail**: the events after the
row's last attempted or confirmed event. Anything at or before that point is kept as is.

With this rule the server cannot tell a compacted outbox from a user who made fewer edits. No new
event type, no endpoint, and no server-side conflict handling is needed.

---

## Collapse rules (per row, over its unsent tail, in `localSeq` order)

The first event in the tail is `first`, the last is `last`. Whether the row exists upstream depends on
whether `first` is an insert.

| Unsent tail                            | Result                                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| single event                           | unchanged                                                                                                   |
| `insert`, then updates                 | one `insert`, payload = `last.payload`, `previous` = null                                                   |
| updates only                           | one `update`, payload = `last.payload`, `previous` = `first.previous`                                       |
| `insert` … `delete`                    | **nothing** (no other device ever saw the row)                                                              |
| updates … `delete`                     | one `delete`, payload = `last.payload`, `previous` = `first.previous`                                       |
| `delete`, then `insert` … (re-created) | one `update`, payload = `last.payload`, `previous` = `first.previous` (row existed before and exists after) |
| `delete`, then `insert` … `delete`     | one `delete`, payload = `last.payload`, `previous` = `first.previous`                                       |
| `insert` … `delete`, then `insert` …   | one `insert`, payload = `last.payload`                                                                      |

Rule of thumb: existed-before = first is not an insert; exists-after = last is not a delete.
Both → update; before only → delete; after only → insert; neither → drop.

Merged event fields:

- `eventId`: keep `last.eventId` (it was never sent, so no dedupe risk).
- `txId`: `last.txId`. The library never splits a `txId` across push batches; a merged event joining
  `last`'s transaction keeps that guarantee.
- `timestamp`: `last.timestamp`.
- `schemaVersion`: `last.schemaVersion`. If the tail mixes schema versions, **do not merge that row**.
- `baseVersion`: `first.baseVersion` (conflict detection is off in the app, but keep it correct).
- `localSeq`: see ordering below.

---

## Ordering

The server projects in `globalSeq` order and devices replay in that order, so parents must stay ahead
of children.

- A merged **insert** takes the `localSeq` of the row's **first** event (a parent inserted early stays early).
- A merged **update/delete** takes the `localSeq` of the row's **last** event.
- Owned children (`library-references.ts` `ownedChildren`, e.g. bullets) are deleted before their parent
  already; keep that by not moving a delete earlier than its `last` position.
- Rows inside one original transaction that end up in different merged positions are fine: each merged
  event is a full row (LWW on `updatedAt`), and projection already defers foreign-key failures.

Open check: confirm the outbox push order really is `localSeq` (it is per ARCHITECTURE.md) and that
rewriting `localSeq` on an existing row is picked up by the due-set query.

---

## Crash safety

The outbox is a persisted TanStack collection; there is no multi-row transaction across it. Write order:

1. Update the survivor row (`last.eventId`) in place with the merged `type`, `payload`, `previous`,
   `localSeq`, `baseVersion`.
2. Delete every other event in the tail.
3. For "drop" rows (insert … delete), delete all of them, `last` included.

A crash after step 1 leaves the merged event plus some originals; all of them push, the merged one
(highest `updatedAt`) wins. Nothing is lost. A crash during step 3 leaves a partial insert/delete pair,
which still nets to "row does not exist".

---

## Locking

Compaction must not run while a push is in flight in this tab or another.

- `runManagedSync` already coalesces syncs in this tab (`managedSyncInFlight`).
- Across tabs, the library uses a Web Lock (`createWebLocksSyncLock`, name based on the database name).
  Take the **same lock name** with `ifAvailable: true`, compact, release, then call `db.sync()`.
  If the lock is unavailable another tab is syncing; skip compaction this round.
- Verify the exact lock name the library uses for `agentic-json-resume.sqlite` before relying on it.
  If it is not stable, add an explicit `lockName` in `collection.ts` and use that constant in both places.
- Node test devices have no Web Locks; inject the lock so tests can pass a no-op or a fake.

---

## Retention policy (server)

### Schema

New Drizzle table, generated with `db:generate` (no hand-written SQL):

```ts
sync_policy
  id            text primary key   // "default" or a user id
  user_id       text null references user(id) on delete cascade, unique
  retention_ms  integer not null
  updated_at    integer (timestamp_ms)
  updated_by    text null          // admin user id, for the audit trail
```

- One row with `id = "default"` and `user_id = null` holds the global default (7 days).
- A row per user overrides it.
- Clamp on write: at least `MIN_SERVER_RETENTION_MS` (1h, already in `squash.server.ts`), at most
  e.g. 365 days.

### Endpoint

- `GET /api/sync/policy` (session required) → `{ retentionMs, outboxCompactMinEvents }`.
- The device caches it in the local `settings` collection with a fetched-at stamp, refreshes on app start
  and at most once per hour, and falls back to the cached value (or 7 days) offline.

### Admin UI

- New card on the admin data page: edit the default window; list and edit per-user overrides
  (reuse `AdminUserSelect`). Changes go through `auditAdminAction`.

### Server squash

- `squashUserLogsIncrementally` takes `retentionMs` per user: join `sync_policy` (user row, else default)
  in `pickUsers`, compute the cutoff per user.
- `squashSyncEvents` (admin manual squash) uses the same lookup unless an explicit `retentionMs` is passed.
- Replace `DEFAULT_RETENTION_MS` uses with the policy lookup; keep the constant as the fallback default.

### Device squash of synced events

- `runManagedSync` calls `squashLocalEvents(db, history, now - policy.retentionMs)` instead of the fixed 24h.
- Keep `LOCAL_EVENT_HORIZON_MS` at least as long as the window (use `max(7 days, retentionMs)`), otherwise
  the device prunes history the user is entitled to restore from.

---

## Flood cap (server)

Backstop for old clients that never compact:

- Per-user cap on push volume, e.g. N events per minute, enforced in `pushSyncEvents`.
- Over the cap: reply `retryable: true` with a `RATE_LIMITED` code so the library backs off instead of
  dead-lettering. Never reject non-retryably for volume.
- Log the user and counts so heavy users show up in the admin stats.

---

## Library merge compaction cleanup

- Remove `__compaction_request__` handling: `COMPACTION_REQUEST_COLLECTION`, `compactionRequestSchema`,
  `compactionRequestEvent`, the request branch in `sync-compaction.ts` `observe`, and
  `requestLibraryCompaction` in `compaction.server.ts`.
- Remove `compactLibraryFn` / `pruneLibraryFn` and the `CompactLibraryAction` / `PruneLibraryAction`
  cards (and their place in `DataActionsSheet`).
- Keep `COMPACTION_REQUEST_COLLECTION` in projection `SKIP_COLLECTIONS` for markers already in logs,
  or leave it skipped as an unknown collection.
- Keep the automatic duplicate merge after sync exactly as it is.

### Prune from settings

- New "Clean up unused library rows" action in the user's settings (route `-components/`).
- Confirmation dialog listing what will be deleted (run `planCompaction(..., { prune: true })` first and
  show `pruned` counts; nothing is sent until confirmed).
- On confirm: sync first, then plan with `prune: true` and propose via `/api/sync/compact`
  (same accept-or-stale path). On `stale`, sync and re-plan once, then report.
- Expose this as `syncCompaction.pruneNow(db)` returning the outcome and counts.

---

## Interactions to check

- **Stale-replay guard**: unchanged; merged events carry the final row and its `updatedAt`.
- **Compaction replay guard** (held-back deletes): unchanged; it only looks at events from
  `COMPACTION_CLIENT_ID`.
- **Event history / restore** (`event-history.ts`, `restoreToEvent`, `revertOwnEvents`): intermediate
  unsent edits disappear after compaction. Restore UI must not offer points that no longer exist; check
  it reads from the outbox live.
- **Sync progress UI** (`sync-progress.ts`): pending counts drop after compaction; make sure the progress
  bar is started after compaction, not before.
- **Push tuning** (`sync-push-tuning.ts`): fewer, larger events; batches still respect byte limits.
- **Backend reset** (`resetCursor` requeue): requeued events have `attemptCount` reset to 0. They were
  already on the old backend, but the new backend never saw them, so compacting them is safe. Confirm.
  (The app uses `backendMismatch: "fail"` and wipes the device anyway.)
- **Local echo skip**: the merged event keeps `last.eventId`, which is in the outbox, so its echo is skipped.

---

## Files (expected)

New:

- `apps/web/src/data-access-layer/event-sourced/outbox-compaction.ts`: pure planner
  (`planOutboxCompaction(entries, { now, windowMs, minEvents })`) and the writer that applies it.
- `apps/web/src/data-access-layer/event-sourced/outbox-compaction.test.ts`: planner unit tests.
- `apps/web/src/data-access-layer/event-sourced/multi-device/outbox-compaction.test.ts`: multi-device tests.
- `apps/web/src/data-access-layer/event-sourced/sync-policy.ts`: query options plus the cached-policy reader.
- `apps/web/src/lib/drizzle/scheam/sync-policy.ts`: Drizzle table.
- `apps/web/src/modules/sync/sync-policy.server.ts`: lookup, clamp, upsert.
- `apps/web/src/routes/api/sync/policy.ts`: `GET` handler.
- Admin card: `routes/_dashboard/admin/data/-components/SyncPolicyAction.tsx`.
- Settings action: `routes/_dashboard/settings/-components/LibraryCleanupSection.tsx` (or wherever the
  settings route keeps its sections).

Changed:

- `app-settings.ts` (`runManagedSync`: lock, compact, sync, policy window for local squash)
- `collection.ts` (explicit `lockName` if needed)
- `squash-incremental.server.ts`, `squash.server.ts`, cron route (per-user window)
- `sync-events.server.ts` (flood cap)
- `sync-compaction.ts`, `compaction-protocol.ts`, `compaction.server.ts` (remove requests, add `pruneNow`)
- `admin.functions.ts` (drop compact/prune fns, add policy fns)
- `DataActionsSheet.tsx` (swap cards)
- `multi-device/sync-test-devices.ts` (inject lock and policy)

Removed:

- `CompactLibraryAction.tsx`, `PruneLibraryAction.tsx`

---

## Build order

1. **Policy**: schema + `db:generate`, server lookup/clamp, `GET /api/sync/policy`, admin card,
   per-user window in the cron and manual squash.
2. **Outbox planner**: pure function plus unit tests (all collapse rules, eligibility, ordering,
   mixed schema versions).
3. **Outbox writer + wiring**: crash-safe apply, lock, call from `runManagedSync` before `db.sync()`,
   policy-driven local squash and horizon.
4. **Multi-device tests** (below).
5. **Library cleanup**: remove admin request path and cards, add settings prune action.
6. **Flood cap** on push.
7. Full `check-types`, `vp lint`, `vp test`; manual run with two browser profiles.

---

## Tests

### Planner unit tests

- Each collapse rule in the table, including delete → insert re-creation and insert → delete → insert.
- Events with `attemptCount > 0`, `syncStatus: "failed"`, or `sync: true` are never merged; only the
  tail after them is.
- Mixed `schemaVersion` in a tail leaves that row alone.
- Below 100 events and inside the window → no-op; ≥ 100 → everything unsent; one event past the window
  with fewer than 100 → everything unsent.
- Merged insert keeps the first `localSeq`; merged update/delete keeps the last `localSeq` and `txId`.
- `localOnly` collections are untouched.

### Multi-device tests (real collections, `createSyncDevices`)

- Device offline for 1,000 edits across 20 rows pushes about 20 events; another device ends with identical rows.
- Insert then delete while offline pushes nothing; other devices never see the row.
- Parent experience and bullets created offline arrive on another device and project in order.
- An event that was attempted (transport failure after send) is never merged; the server ends with no
  duplicate or lost row.
- Crash simulation: apply only step 1 of the writer, then sync; the result is still correct.
- Two devices offline, both compact, both push: same result as without compaction (LWW on `updatedAt`).
- Per-user window from the policy is respected (short window compacts old events; long window leaves them).
- Prune from settings on one device converges on every device; a stale prune re-plans once.
- Compaction skipped while another "tab" holds the lock.

---

## Open questions

- Exact library Web Lock name, and whether `localSeq` can be rewritten on an existing outbox row.
- Should the 100-event threshold also be in `sync_policy` so admins can tune it, or stay a device constant?
- Flood-cap numbers (events per minute) and whether premium users get a higher cap.
- Where in settings the prune action lives, and whether it needs the event-log backup the admin prune used to take.
