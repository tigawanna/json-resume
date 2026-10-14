# Sync Module

## Objective

The server-side and shared logic behind the app's local-first sync:

- an append-only event log per user (`syncEvent` table) that devices push to and pull from
- log hygiene: squashing superseded old events and compacting unreferenced library rows so the log and every device stay small
- projection of applied events back into the Drizzle tables (legacy read-model support)
- admin-triggered log rebuilds, which swap a user's backend so devices resync from zero

Device-side counterparts live in
`@/data-access-layer/event-sourced/sync/` (transport, per-device compaction runner,
push tuning, stale-replay guard).

## Layout

```
sync/
├── plan/            # pure, isomorphic planners and protocol (no server imports)
├── server/          # server-only handlers (push/pull endpoint, squash, compaction, projection)
└── device-compaction/ # device-side compaction entry point (see its own README)
```

## `plan/` — pure, isomorphic logic

| File                            | Purpose                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `squash-plan.ts`                | Which log events are superseded by a newer event for the same row (within a retention window).                                              |
| `squash-plan.test.ts`           | Tests for the squash planner.                                                                                                               |
| `compact-plan.ts`               | Which unreferenced / duplicate library rows (experiences, bullets, skills, …) can be merged away into compaction ops.                       |
| `compact-plan.test.ts`          | Tests for the compaction planner.                                                                                                           |
| `compaction-protocol.ts`        | Zod schemas for proposals/outcomes and the accept-or-stale rule (device plans, server appends only if the log hasn't moved past `baseSeq`). |
| `projection-constraint.ts`      | Parses SQLite `UNIQUE constraint failed: …` / FK errors out of projection writes.                                                           |
| `projection-constraint.test.ts` | Tests for those parsers.                                                                                                                    |
| `sync-reset.ts`                 | `__sync_reset__` marker event + `userBackendId` so devices resync from zero after a log rebuild.                                            |

## `server/` — server-only handlers

| File                           | Purpose                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `sync-events.server.ts`        | The push/pull sync endpoint logic: stores outbox events, returns paged pulls.                               |
| `squash.server.ts`             | Server fn entry point that runs squash + catches up the projection, with a minimum server retention.        |
| `squash-incremental.server.ts` | Incrementally squashes per-user logs in bounded steps, backed by `syncSquashState`.                         |
| `squash-incremental.test.ts`   | Tests for incremental squashing against a real libSQL database.                                             |
| `compaction.server.ts`         | Server fn applying a compaction proposal against the log (first proposal wins, later ones come back stale). |
| `project-legacy.server.ts`     | Projects applied sync events into the legacy Drizzle tables.                                                |

## `device-compaction/`

Device-side compaction entry point — see its own README.
