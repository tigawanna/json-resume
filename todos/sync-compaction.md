# Sync, compaction & event log

Consolidated from `compaction.md`, `outbox-compaction.md`, `event-squash.md`,
`broken-tests-undo-and-compaction.md`, and the sync/release items from
`next-release.md`. Dashboard/UI items were dropped.

---

## 1. Client-side compaction exploration

Explore moving compaction into the clients so each client reconciles its own
history and pushes final results with delete directives; the server only replays
and broadcasts. This would be a compaction event type: when a client receives one
from upstream it stops implementing its own compactions and replays the incoming
ones. If it had already implemented them and was waiting to push, it should not
push; instead replay the incoming ones (likely no-op, or a rare update that had
not yet been pulled comes through in compacted form). If state on this node
differs from what the compaction event has, send it out as a regular event, and
guard against death loops where clients delete each other's events.

Tests: real collections with a multi-device setup, including clients that go
offline too long and diverge before receiving a compaction event.

Current status: `compactOnClient` and `compactOnServer` are still stubs that throw
"not implemented". `sync-compaction.test.ts` only exercises the seed fixture and
asserts the `compactOnWrite` coalesced shape (passes). Real compaction coverage
is still missing.

---

## 2. Device-driven outbox compaction (unsent events)

Follow-up to section 1. Goal: a device offline for 1,000 edits pushes ~one event
per touched row; no admin action; server only enforces integrity.

### Trigger

Run outbox compaction right before a sync when either:

1. Outbox has >= 100 never-sent events (`OUTBOX_COMPACT_MIN_EVENTS`).
2. Any never-sent event is older than the user's window (`timestamp < now - windowMs`).

When it fires, every never-sent event is eligible.

### Eligibility (integrity rule)

Only events that cannot have reached the server:

- `sync === false`
- `attemptCount === 0`
- `syncStatus === "pending"`
- not in `deadletter`
- not a `localOnly` collection

Per row, compaction only covers the unsent tail: events after the row's last
attempted/confirmed event.

### Collapse rules (per row, over unsent tail, in `localSeq` order)

First = first tail event, last = last tail event. Existed-before = first is not an
insert; exists-after = last is not a delete.

| Unsent tail                          | Result                                                        |
| ------------------------------------ | ------------------------------------------------------------- |
| single event                         | unchanged                                                     |
| insert, then updates                 | one insert, payload = last.payload, previous = null           |
| updates only                         | one update, payload = last.payload, previous = first.previous |
| insert ... delete                    | nothing (no other device ever saw the row)                    |
| updates ... delete                   | one delete, payload = last.payload, previous = first.previous |
| delete, then insert ... (re-created) | one update, payload = last.payload, previous = first.previous |
| delete, then insert ... delete       | one delete, payload = last.payload, previous = first.previous |
| insert ... delete, then insert ...   | one insert, payload = last.payload                            |

Merged event fields: `eventId` = last.eventId; `txId` = last.txId; `timestamp` =
last.timestamp; `schemaVersion` = last.schemaVersion (do not merge if mixed);
`baseVersion` = first.baseVersion; `localSeq` = see ordering.

### Ordering

- Merged insert takes the `localSeq` of the row's first event.
- Merged update/delete takes the `localSeq` of the row's last event.
- Owned children deleted before parent already; keep by not moving a delete
  earlier than its last position.

### Crash safety

Outbox is a persisted collection; no multi-row transaction. Write order:

1. Update survivor row (`last.eventId`) in place with merged type/payload/previous/
   localSeq/baseVersion.
2. Delete every other event in the tail.
3. For "drop" rows (insert ... delete), delete all of them, last included.

Crash after step 1 leaves merged event plus some originals; all push, merged one
(highest updatedAt) wins. Nothing lost.

### Locking

Must not run while a push is in flight in this or another tab.

- `runManagedSync` already coalesces syncs in this tab.
- Across tabs, use the library's Web Lock (`createWebLocksSyncLock`, name based on
  DB name) with `ifAvailable: true`; skip compaction this round if unavailable.
- Node test devices have no Web Locks; inject the lock so tests can pass a no-op
  or fake.

### Retention policy (server)

New Drizzle table `sync_policy`:

- `id` text PK ("default" or user id)
- `user_id` text null FK user, unique
- `retention_ms` integer not null
- `updated_at` integer (timestamp_ms)
- `updated_by` text null (admin user id)

One row `id = "default"`, `user_id = null` holds the global default (7 days); a
row per user overrides it. Clamp on write: at least `MIN_SERVER_RETENTION_MS`
(1h), at most 365 days.

- `GET /api/sync/policy` (session required) -> `{ retentionMs, outboxCompactMinEvents }`.
- Device caches in local settings collection with fetched-at stamp, refreshes on
  app start and at most once per hour, falls back to cached (or 7 days) offline.
- Server squash: `squashUserLogsIncrementally` takes `retentionMs` per user (join
  `sync_policy`, user row else default), compute cutoff per user. Admin manual
  squash uses same lookup unless explicit `retentionMs` passed.
- Device squash of synced events: `runManagedSync` calls
  `squashLocalEvents(db, history, now - policy.retentionMs)` instead of fixed 24h.
  Keep `LOCAL_EVENT_HORIZON_MS` at least as long as the window
  (`max(7 days, retentionMs)`).

### Flood cap (server)

Backstop for old clients that never compact: per-user cap on push volume
(e.g. N events/minute) enforced in `pushSyncEvents`. Over cap: reply
`retryable: true` with `RATE_LIMITED` so the library backs off; never reject
non-retryably for volume. Log user and counts.

### Library merge compaction cleanup

- Remove `__compaction_request__` handling: `COMPACTION_REQUEST_COLLECTION`,
  `compactionRequestSchema`, `compactionRequestEvent`, request branch in
  `sync-compaction.ts` `observe`, `requestLibraryCompaction` in `compaction.server.ts`.
- Remove `compactLibraryFn` / `pruneLibraryFn` and `CompactLibraryAction` /
  `PruneLibraryAction` cards (and their place in `DataActionsSheet`).
- Keep `COMPACTION_REQUEST_COLLECTION` in projection `SKIP_COLLECTIONS` for markers
  already in logs, or leave skipped as unknown collection.
- Keep automatic duplicate merge after sync as is.

### Prune from settings

- New "Clean up unused library rows" action in user settings.
- Confirmation dialog listing what will be deleted (run
  `planCompaction(..., { prune: true })` first, show `pruned` counts; nothing sent
  until confirmed).
- On confirm: sync first, then plan with `prune: true` and propose via
  `/api/sync/compact` (same accept-or-stale path). On `stale`, sync and re-plan
  once, then report.
- Expose as `syncCompaction.pruneNow(db)` returning outcome and counts.

### Build order

1. Policy: schema + `db:generate`, server lookup/clamp, `GET /api/sync/policy`,
   admin card, per-user window in cron and manual squash.
2. Outbox planner: pure function + unit tests (all collapse rules, eligibility,
   ordering, mixed schema versions).
3. Outbox writer + wiring: crash-safe apply, lock, call from `runManagedSync`
   before `db.sync()`, policy-driven local squash and horizon.
4. Multi-device tests.
5. Library cleanup: remove admin request path and cards, add settings prune action.
6. Flood cap on push.
7. Full `check-types`, lint, tests; manual run with two browser profiles.

### Tests

Planner unit tests: each collapse rule including delete -> insert re-creation and
insert -> delete -> insert; events with `attemptCount > 0`, `syncStatus: "failed"`,
or `sync: true` never merged (only tail after them); mixed `schemaVersion` leaves
that row alone; below 100 and inside window -> no-op; >= 100 -> everything unsent;
one event past window with fewer than 100 -> everything unsent; merged insert
keeps first `localSeq`; merged update/delete keeps last `localSeq` and `txId`;
`localOnly` collections untouched.

Multi-device tests (real collections, `createSyncDevices`): offline 1,000 edits
across 20 rows pushes ~20 events and converges; insert then delete while offline
pushes nothing; parent experience and bullets created offline arrive and project
in order; attempted event (transport failure after send) never merged; crash
simulation applying only step 1 then sync still correct; two devices offline both
compact both push same result as without compaction; per-user window respected;
prune from settings converges on every device with stale re-plan once; compaction
skipped while another tab holds the lock.

### Open questions

- Exact library Web Lock name, and whether `localSeq` can be rewritten on an
  existing outbox row.
- Should the 100-event threshold also be in `sync_policy` so admins can tune it, or
  stay a device constant?
- Flood-cap numbers (events per minute) and whether premium users get a higher cap.
- Where in settings the prune action lives, and whether it needs the event-log
  backup the admin prune used to take.

---

## 3. Event squash + undo

Goal: stop the event log growing forever, give each résumé a dedicated events
view, and let a user roll a résumé back to any recorded event.

### Squash rule (one rule, both cases)

For every row (`collectionId` + `key`), the latest event is the truth:

- latest is insert/update -> its payload is the whole row, every earlier event is
  dead weight ("collapse updates");
- latest is delete -> it stays as a tombstone so devices still holding the row
  drop it; every earlier event is dead weight ("squash deletes").

An event is removed only when superseded and older than the retention cutoff
(default 24h), so recent history stays available for undo.

Never removed: latest event of a row, reset markers (`__sync_reset__`), pending
outbox events, unresolved/skipped inbox events, unprojected server events.

Trade-offs: undo only reaches retained history; server rows survive at latest seq
so a fresh device may replay a child before its parent (harmless, no FKs on
client); tombstones kept forever.

### Phases

1. Shared planner — `modules/sync/squash-plan.ts`: `planSquash`, `planRestore`,
   unit tests (`squash-plan.test.ts`, 11 passing). Done.
2. Server pruning (`sync_event`): `squashSyncEvents` in `squash.server.ts`;
   admin Squash dialog on `/admin/tables/sync_event`; `/admin/data` Actions drawer;
   cron `/api/cron/squash-sync-events`; nightly in `vercel.json` (03:30).
   - [ ] run once against the real DB (take a `sync_event` backup first) and check counts
3. Local pruning (device outbox + inbox): `squashLocalEvents` in
   `event-history.ts`; runs after every successful managed sync (24h retention).
   - [ ] browser check of squash with real synced events (only unit-tested so far)
4. Per-résumé events view `/resumes/$resumeId/events`: timeline, squash preview +
   "Squash on this device", link from actions drawer. Done.
5. Undo: "Restore to here" writes normal mutations; confirm dialog; timeline marks
   events to be undone; browser verification of update rollback and insert removal
   worked. Done.

Later:

- [ ] drop very old tombstones once every device is known to be past them
- [ ] undo for library entries from their own pages (same `restoreToEvent`,
      different filter)

### Event squash refinement (from next-release)

- [ ] Make the retention window a per-plan setting instead of `DEFAULT_RETENTION_MS`
      (pro keeps 7 days, free keeps 24h or less). See free/pro plans below.
- [ ] Coalesce unsynced device events before push (merge consecutive pending
      updates to the same row; first check `event-sourced-collection` allows rewriting
      pending outbox rows without breaking `localSeq`).
- [ ] Optional: résumé-scoped squash (résumé row + linked library rows, one cutoff).
- [ ] Later: drop very old tombstones; undo for library entries from their pages.

---

## 4. Broken tests: AI undo + sync compaction

Status: pre-existing failures, not caused by the dependency security upgrade.
Suite 316/320 passing; 4 failures in `local-undo-tools.test.ts`
(`undo_last_ai_change`).

### Root cause

Recorded `[fromSeq, toSeq)` range is captured before the write lands. Fixture
writes are fire-and-forget (`insertSummary`/`insertResume` without awaiting
`isPersisted.promise`), and `trackAiChange` snapshots `toSeq` in a `finally`
immediately after `run()` resolves, while event-sourced writes commit outbox rows
asynchronously and one tool call can span several transactions. Result: `toSeq`
smaller than real end; `eventsOf` buckets by `txId` and keeps only the bucket
minimum in range, selecting the seeded row instead of the assistant's new row.

### Fix direction

- [ ] Resolve the end of the range lazily: record only `fromSeq` (or a pending
      marker) in `trackAiChange`, compute `toSeq` in `undoLocalAiChange` from the
      current outbox high-water mark.
- [ ] Or await outbox quiescence before recording `toSeq`.
- [ ] Make the fixture honest: expose async `insert*` helpers awaiting
      `isPersisted.promise`, or have `useLocalToolDb` settle the outbox before
      returning.
- [ ] Keep `eventsOf`'s `txId` bucketing only if a tool call can share a
      transaction with unrelated writes; otherwise select directly by `localSeq` range.
- [ ] Add regression cases: undo the very first tracked call after seeding, a call
      that writes two collections (`updateSummary`), and a call whose outbox writes
      land late.

Files: `local-undo-tools.ts`, `local-tool-fixtures.ts`,
`event-sourced/resume/event-history.ts`, `resume-tool-schemas.ts`.

### Sync compaction seed (resolved)

`sync-compaction.test.ts` used to fail (hook timeout + obsolete event count under
`compactOnWrite`). Fixed: 30s hook timeout; assert coalesced shape (one insert per
row, `compaction: true`, `payload.updatedAt === HISTORY_UPDATES + 1`); renamed
test. 4 undo tests remain red.

- [ ] Once `compactOnClient` / `compactOnServer` exist, add real compaction tests:
      fold only synced history, respect retention, reject a proposal when the log moved
      past `baseSeq`, multi-device replay cases from `compaction.md`.

### Definition of done

- [ ] `local-undo-tools.test.ts` x4 pass; range resolved after writes land.
- [x] `sync-compaction.test.ts` no longer times out and asserts an invariant
      matching `compactOnWrite`.
- [ ] Full `pnpm test` green (320/320). Currently 316/320.
- [ ] Fixes independent of the dependency upgrade.

---

## 5. Free / pro plans (groundwork, no payments yet)

Everyone on free; plan is a hard-coded flag. Limits enforced where data reaches
the server (event level).

- [ ] Plan flag on the user (`"free" | "pro"`, default `"free"`), via Better Auth
      `additionalFields` + `auth:migrate` (never edit auth schema by hand), or a
      separate Drizzle table.
- [ ] One limits config (e.g. `config/plans.ts`) per plan: max résumés (free: 10),
      events pushed per day/month, server retention, device retention, whether pending
      events are coalesced.
- [ ] Event push quota (server): sync push endpoint counts a user's events in the
      window and rejects pushes over quota with a typed error; local writes keep
      working; events wait in the outbox.
- [ ] Stricter compaction on free: shorter retention on server and device, outbox
      coalescing always on.
- [ ] Résumé cap: block create, clone and import past the limit in the UI and in
      AI tools (`create_resume`, `clone_resume`, `tailor_resume_for_job`); also check
      on the server at push time; define what happens to a rejected résumé insert
      after the device already has it.
- [ ] Sync status UI: clear "Sync paused — free plan limit reached" state instead
      of silent failure.
- [ ] Plan UI: plan badge, usage meters (résumés x/10, events this period),
      "Upgrade" button saying "coming soon".
- [ ] Admin: switch a user's plan from admin tables / data page.
- [ ] Optional: tie AI credits (`ResumeAiCredits`) to the plan.
- [ ] Later: Stripe checkout + webhook flips the flag.

---

## 6. Sync release checks

- [ ] Back up Turso (`sync_event` backup + `turso db shell ... .dump`).
- [ ] Take a `sync_event` backup, run server squash once against the real DB, check
      counts.
- [ ] Browser check of device squash with real synced events.
- [ ] Confirm nightly cron (`/api/cron/squash-sync-events`, 03:30) runs after deploy.
- [ ] `pnpm` typecheck, lint and unit tests pass on the release branch.
- [ ] Merge feature branch, deploy, smoke-test sign-in, sync, AI chat and PDF export.
