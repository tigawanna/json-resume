# Broken tests: AI undo + sync compaction

Status: **pre-existing failures**, not caused by the dependency security upgrade.

The suite is at **316 / 320 passing**. The 4 remaining failures all live in
`local-undo-tools.test.ts` and were reproduced unchanged on `43fcdc5` (the commit
before the upgrade) with the old dependency versions (`better-auth 1.6.9`,
`vite-plus 1.0.0`, `vitest 5.0.1`). The event-store stack is identical on both
sides of the upgrade (`event-sourced-collection 0.0.16`, `@tanstack/db 0.7.2`,
`better-sqlite3 13.0.3`).

The sync-compaction seed test that used to fail is fixed; see
[section 2](#2-sync-compaction-seed--resolved).

| File                                                                                                | Tests     | Feature                       |
| --------------------------------------------------------------------------------------------------- | --------- | ----------------------------- |
| [`local-undo-tools.test.ts`](../apps/web/src/routes/_dashboard/-ai/-utils/local-undo-tools.test.ts) | 4 failing | `undo_last_ai_change` AI tool |

Reproduce:

```bash
cd apps/web
pnpm exec vitest run src/routes/_dashboard/-ai/-utils/local-undo-tools.test.ts
```

---

## 1. `undo_last_ai_change` — 4 failures

### The feature

`undo_last_ai_change` lets the assistant step back one write-tool call at a time
("undo that", "put the summary back").

- Implementation: `apps/web/src/routes/_dashboard/-ai/-utils/local-undo-tools.ts`
- `trackAiChange(ctx, tool, run)` wraps every local write tool, records the outbox
  `localSeq` range for that call on `ctx.changes`, and runs `run()`.
- `undoLocalAiChange` pops the newest change, finds its outbox events with
  `eventsOf`, and calls `revertOwnEvents`
  (`data-access-layer/event-sourced/resume/event-history.ts`) to restore each row
  to the state before the call. Rows edited by the user since are skipped.
- Contract: `AiChange` is `{ tool, fromSeq, toSeq }`, documented as "the outbox
  transactions whose first event got a `localSeq` in `[fromSeq, toSeq)`"
  (`features/agentic-tools/definitions/tool-context.ts`).

### Failures

Run output (Vitest 5.1.0):

| Test                                    | Expected                               | Actual                                 |
| --------------------------------------- | -------------------------------------- | -------------------------------------- |
| reverts the last write tool call        | summaries `["Old summary"]` after undo | `["New summary"]` (line 42)            |
| steps back one call at a time           | first `undoneTool` = `set_summary`     | `update_resume_details` (line 55)      |
| leaves rows the user edited since alone | `reverted: 0`, `skipped: [cv]`         | `reverted: 1`, `skipped: []` (line 76) |
| removes a résumé the assistant created  | `activeResumeId: null`                 | the created id (line 96)               |

### Root cause (confirmed by instrumenting the outbox)

The recorded `[fromSeq, toSeq)` range is captured before the write actually lands.

1. The fixture writes are fire-and-forget.
   `useLocalToolDb`'s `insertSummary` / `insertResume`
   (`local-tool-fixtures.ts`) call `db.collections.*.insert(...)` without awaiting
   `isPersisted.promise`. Right after `seed()`, the outbox is still empty.
2. `trackAiChange` snapshots `toSeq` too early.
   It computes `toSeq = nextOutboxSeq(ctx.db)` in a `finally` block immediately
   after `run()` resolves. Event-sourced writes commit their outbox rows
   asynchronously, and one tool call can span several transactions
   (`updateSummary` writes the new `resumeSummary` row and the `resume.layout`
   update separately). So `toSeq` is smaller than the real end of the call.

Instrumented run for `set_summary` on a seeded résumé:

```text
ctx.changes  [{ tool: "set_summary", fromSeq: 0, toSeq: 1 }]

outbox
  seq 0  resumeSummary  s1        insert  text "Old summary"
  seq 1  resume          cv        insert  headline "Engineer"
  seq 2  resumeSummary  <new id>  insert  text "New summary"

undo -> { undoneTool: "set_summary", reverted: 1, skipped: [] }
```

`eventsOf` buckets entries by `txId` first, then keeps only the bucket minimum in
range. With `[0, 1)` it selects the **seeded** `s1` insert, so undo removes the old
summary instead of the assistant's new row. The résumé still reads `"New summary"`.

With two tracked calls the range collapses further:

```text
ctx.changes
  [{ tool: "update_resume_details", fromSeq: 0, toSeq: 1 },
   { tool: "set_summary",           fromSeq: 1, toSeq: 1 }]   # empty range
```

The first undo pops `set_summary`, finds nothing, then pops
`update_resume_details` and still reverts the seed event. The test sees
`undoneTool: "update_resume_details"` instead of `"set_summary"`.

This also explains the other two failures: `create_resume` never enters its
recorded range (so the résumé survives), and the "user edited since" case reverts
the seed row instead of validating the `resume` row and skipping it.

Production impact: after a real tool call the assistant can undo an earlier change
or no-op, because the range is closed before all outbox writes exist. `settle()`
in the tests only helps _after_ tracking; it cannot fix a `toSeq` already recorded.

### Fix direction

- [ ] **Resolve the end of the range lazily.** Record only `fromSeq` (or a
      "pending" marker) in `trackAiChange`, and compute `toSeq` in
      `undoLocalAiChange` from the current outbox high-water mark. Then all events
      written by the call are included.
- [ ] Or await outbox quiescence before recording `toSeq` (e.g. a helper that
      waits until no new `localSeq` appears), so the range is final.
- [ ] Make the fixture honest: expose async `insert*` helpers that await
      `isPersisted.promise`, or have `useLocalToolDb` settle the outbox before
      returning. This removes the `fromSeq: 0` race from the tests.
- [ ] Keep `eventsOf`'s `txId` bucketing only if a tool call can share a
      transaction with unrelated writes; otherwise select directly by
      `localSeq` range.
- [ ] Add regression cases: undo the very first tracked call after seeding, a
      call that writes two collections (`updateSummary`), and a call whose outbox
      writes land late.

Files: `local-undo-tools.ts`, `local-tool-fixtures.ts`,
`event-sourced/resume/event-history.ts`, `resume-tool-schemas.ts`.

---

## 2. Sync compaction seed — resolved

### The feature

Client-side library compaction: after a successful sync, a device plans a
compaction proposal, folds synced history, and pushes the proposal so other
devices replay it. Design notes live in
[`compaction.md`](./compaction.md) and [`outbox-compaction.md`](./outbox-compaction.md).

Current state: the entrypoints are **stubs**.

- `modules/sync/client/compaction/sync-compaction.ts` — `compactOnClient` loops
  the library keys and then `throw new Error("compactOnClient is not implemented")`.
- `modules/sync/server/compaction/compaction.server.ts` — `compactOnServer` also
  throws `"not implemented"`.
- Called from `runManagedSync` (`data-access-layer/event-sourced/app-settings.ts`);
  the client error is caught and logged.

The test only asserted the `openSeededLibrary` fixture
(`modules/sync/client/compaction/open-seeded-library.ts`
→ `testing/seed-history/seed-history.ts`), not compaction itself:

```ts
beforeEach(async () => {
  seeded = await openSeededLibrary({ resumes: 5, updates: HISTORY_UPDATES });
});
```

### What was failing

**A. Hook timeout.** The seed writes 5 résumés × 16 collections × 21 writes ≈
**1,680 awaited writes**. Standalone it takes ~5–6 s; under the full parallel
suite it exceeded Vitest's default 10 s `hookTimeout`:

```text
Error: Hook timed out in 10000ms.
 ❯ src/modules/sync/client/compaction/sync-compaction.test.ts:8:1
```

**B. Obsolete event count.** The test expected one create + 20 updates = 21
outbox events per row. `event-sourced-collection 0.0.16` enables
**`compactOnWrite` by default** (`config.compactOnWrite ?? true`), so each
unpushed update folds into the previous unpushed insert/update. Twenty sequential
updates on the same row leave **one** outbox entry, not 21:

```text
AssertionError: expected [ { …(27) } ] to have a length of 21 but got 1
```

`HISTORY_UPDATES` still matters to the seeder's payload, but not to the number of
outbox rows.

### Fix applied

- [x] Gave `beforeEach` a 30 s timeout, so the ~1,680-write seed stays stable
      under the full parallel suite.
- [x] Asserted the coalesced shape instead of the pre-`compactOnWrite` history:
      one `insert` per row, `compaction: true`, and
      `payload.updatedAt === HISTORY_UPDATES + 1` (the last update).
- [x] Renamed the test to say what it checks ("folds each row's history into one
      pending insert").
- [ ] Once `compactOnClient` / `compactOnServer` exist, add real compaction tests:
      fold only synced history, respect retention, reject a proposal when the log
      moved past `baseSeq`, and the multi-device replay cases from
      [`compaction.md`](./compaction.md).

Result: `316 passed / 320`; only the 4 undo tests remain red.

Files: `sync-compaction.test.ts`, `open-seeded-library.ts`,
`testing/seed-history/*`, `sync/client/compaction/sync-compaction.ts`,
`sync/server/compaction/compaction.server.ts`.

---

## Definition of done

- [ ] `local-undo-tools.test.ts` ×4 pass; range is resolved after writes land.
- [x] `sync-compaction.test.ts` no longer times out and asserts an invariant that
      matches `compactOnWrite`.
- [ ] Full `pnpm test` is green (320/320). Currently 316/320.
- [ ] Fixes are independent of the dependency upgrade so that branch stays
      reviewable on its own.
