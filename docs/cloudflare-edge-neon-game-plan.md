# Cloudflare edge + Neon execution game plan

Status: execution roadmap, 2026-11-27. Architecture decisions live in `docs/cloudflare-edge-neon-plan.md`.

## North star

Ship one proven layer at a time:

1. Nest on Postgres.
2. Web and Nest speaking correctly.
3. Cloudflare auth gateway.
4. D1 waitlist and credits.
5. D1 chat, then a deliberate Durable Object decision.

The frontend keeps calling the same `/api` contract. Custom Durable Objects are out of scope until a later, measured decision.

## Phase 0 — Nest on Postgres

### Database and package setup

- [ ] Use the locally installed Postgres server. Expected defaults: role `dennis`, database `agentic_json_resume_nest`; adjust to the credentials provided.
- [ ] Keep one `packages/db` package with explicit `src/sqlite/` and `src/postgres/` schema/Zod/migration folders; preserve SQLite aliases for web/API.
- [ ] Add Postgres schema/migrations under `packages/db/src/postgres` and a separate `drizzle.postgres.config.ts`.
- [ ] Add `pg` and `drizzle-orm/node-postgres`; keep Nest's existing custom `DRIZZLE` provider and add pool shutdown.
- [ ] Use local Postgres for integration/E2E now; add PGlite later only if its fast-test benefit justifies a separate dependency track.
- [ ] Use Docker only if it materially improves Cloud Run parity testing.

### Schema and runtime port

- [ ] Convert every table Nest touches to `pgTable`: auth, rate limits, credits, waitlist, sync, résumé projections, jobs, cover letters, and admin tables.
- [ ] Generate a new Postgres auth schema with Better Auth tooling; switch `drizzleAdapter` to `provider: "pg"`.
- [ ] Replace epoch-millisecond integers with `timestamptz`, SQLite defaults with Postgres defaults, and JSON text with `jsonb` where queryable.
- [ ] Use `bigserial`/`bigint` for `globalSeq` with explicit number/string handling.
- [ ] Port raw SQL in projection/admin code from `?` parameters and SQLite functions to `$1` parameters, `octet_length`, `pg_catalog`, and Postgres result fields.
- [ ] Replace `db.$client.execute()` assumptions with node-postgres-compatible query/transaction APIs.
- [ ] Replace SQLite `rowid` admin addressing with a stable primary-key locator; port metadata/backups from `sqlite_master`/PRAGMA to `pg_catalog`/`information_schema`.
- [ ] Move all Nest runtime, test, and Zod imports to the Postgres exports together; do not mix dialect table objects.
- [ ] Keep migrations in Drizzle. Generate a fresh Postgres migration history; never replay SQLite SQL.

### Proof and exit criteria

- [ ] Apply migrations to a clean local database and an isolated test database/schema.
- [ ] Run Nest unit, E2E, auth, sync, credits, waitlist, admin, and OpenAPI suites against Postgres.
- [ ] Add real-Postgres tests for transaction races, unique violations, and concurrent projection workers.
- [ ] Start the built Nest artifact with `NODE_ENV=production`; verify `/health`, `/ready`, auth, sync, and clean SIGTERM.
- [ ] Optionally build a Cloud Run test image and prove the same artifact against a reachable Postgres instance.

Exit: Nest no longer imports libSQL at runtime, all tests pass on Postgres, and a clean local/Cloud Run-style boot works.

## Phase 1 — web and Nest integration

- [ ] Fix the web build by deleting dead server modules and migrating/removing the 28 production imports of the deleted DB client.
- [ ] Keep live résumé/GitHub/AI/admin endpoints working through Nest; do not recreate local-first CRUD as REST.
- [x] Add `packages/api-contracts`; freeze response shapes, pagination, errors, and sync payloads.
- [x] Use one build-time `API_ORIGIN`; keep `VITE_NEST_API_URL` as a temporary alias.
- [x] Regenerate the Kubb client from Nest OpenAPI and add contract tests.
- [ ] Remove the `@api` source alias and Hono runtime coupling from web.
- [ ] Run Playwright against real Nest + Postgres: signup/login, viewer, sync push/pull, credits, waitlist, admin, and one AI flow.
- [ ] Deploy web and Nest to staging Cloud Run with Secret Manager and a remote Postgres-compatible database.

Exit: web builds, typechecks, tests, and works end-to-end against Nest with no direct web DB/auth server code.

## Phase 2 — `apps/cloudflare` gateway and auth

- [ ] Create `apps/cloudflare` with Wrangler, local D1, Hono routing, and a route manifest.
- [ ] Run pass-through first: every `/api/*` request proxies to Nest with no behavior change.
- [ ] Add Google IAM ID-token acquisition in the Worker and `internal-and-cloud-load-balancing` on Cloud Run.
- [ ] Add short-lived internal user JWTs; replace Nest's DB auth guard with local verification.
- [ ] Move Better Auth to Worker/D1. Generate its schema with Better Auth tooling and apply migrations with Wrangler.
- [ ] Add `app_user` in Postgres keyed by stable Better Auth id; repoint app foreign keys.
- [ ] Publish identity changes through an idempotent endpoint/queue. Never query D1 from Nest per request.
- [ ] Move `/api/me` and `/api/viewer` to the Worker. Use `auth_version`, cookie caching, and indexed D1 lookups; no custom AuthDO.
- [ ] Invalidate old sessions at cutover; update OAuth callbacks and test password reset, ban, role change, and logout.

Exit: auth-only/rejected traffic stops at Cloudflare; direct Nest calls without IAM + user assertion fail.

## Phase 3 — waitlist and credits in D1

### Shared event pipe

- [ ] Add Postgres inbox/outbox support and `POST /internal/edge-events`.
- [ ] Build D1 outbox relay with leases, Nest ACK, retries, DLQ, and manual replay.
- [ ] Deduplicate by event id, quarantine payload-hash conflicts, and preserve per-aggregate sequence numbers.

### Waitlist

- [ ] Implement existing join/claim/admin contracts in Worker + D1.
- [ ] Use normalized unique email/campaign constraints, command idempotency, conditional claims, and SQL quota guards.
- [ ] Use `withSession("first-primary")` for decisions and read-your-writes.
- [ ] Write mutation and outbox in one D1 batch.
- [ ] Shadow-read against Nest, compare, then cut over writes with a route flag.

### Credits

- [ ] Implement `credit_wallet`, append-only `credit_ledger`, `credit_requests`, optional `credit_holds`, and outbox in D1.
- [ ] Store operation id, request hash, and response. Same key/hash returns the original result; same key/different hash returns 409.
- [ ] Use one guarded SQL operation or atomic batch for idempotency, balance update, ledger insert, and outbox insert.
- [ ] Use integer minor units, unique ledger references, `balance_after`, and SQL non-negative invariants.
- [ ] Never read a balance, return to JavaScript, then debit in a separate request.
- [ ] Keep admin grants/adjustments on the same command API with actor, reason, and idempotency key.
- [ ] Reconcile wallet balance versus ledger sum and outbox high-water marks.
- [ ] If D1-only becomes genuinely awkward, stop and revisit WalletDO separately; do not introduce DOs implicitly.

Exit: waitlist/credits work without Nest, survive retries/races, and appear in Neon through the outbox.

## Phase 4 — chat in D1

- [ ] Upgrade `@tanstack/ai`, `ai-client`, and `ai-react` together; add compatible persistence and durable-stream packages.
- [ ] Implement D1 message/run/interrupt/metadata stores with `defineAIPersistence`; no published D1 adapter exists.
- [ ] Use `useChat({ threadId, persistence: true, history: { pageSize: 50 } })`. Persistence alone still sends full history.
- [ ] Move `/api/ai/*` orchestration out of web. Keep tool schemas shared; server tools call Nest through signed internal HTTP.
- [ ] Store normalized canonical threads/messages/runs/interrupts/metadata in D1; avoid oversized JSON rows.
- [ ] Use a D1 active-run row/conditional lease for basic coordination. The Worker terminates SSE.
- [ ] Use durable-stream resume or `reconstructChat` for rejoin. Do not long-poll or hold a custom DO open.
- [ ] Commit D1 state + outbox atomically. Add producer-death/reaper handling; replay does not restart computation.
- [ ] Move conversation index/search/title state from localStorage to D1. Import dashboard localStorage and résumé OPFS chats idempotently.
- [ ] Introduce generic `chatThread`/`chatMessage`/`chatRun` collections instead of reusing résumé-specific local-only `resumeAiChat`.
- [ ] Move BYOK keys to headers; never persist them. Reject legacy full-transcript POSTs after migration.

Decision gate: measure request size, D1 reads/writes, p95 latency, concurrent-run conflicts, cancellation, and rejoin failures. Only then decide whether a custom `ChatObject(userId, threadId)` is justified.

Exit: a new device restores chat, clients stop sending full transcripts, and chat events are available to Neon/MCP.

## Phase 5 — MCP and remaining routes

- [ ] Project `edgeChat*`, `edgeCredit*`, and `edgeWaitlist*` events into typed Postgres read models.
- [ ] Expose `sourceSeq`, `asOf`, and mirror lag.
- [ ] Validate Better Auth API keys/JWTs at the Worker and forward scoped assertions to Nest.
- [ ] Build MCP/remote-agent tools over projections, not D1 internals.
- [ ] Move public résumé, GitHub BFF, admin event browser, and remaining AI tools route by route.
- [ ] Retire Hono/AWS auth and cron paths, then remove old read-only tables after the rollback window.

## Event and consistency rules

- Envelope: `{ eventId, source, type, version, userId, aggregateId, aggregateSeq, occurredAt, payload }`.
- D1 domain write and outbox write are atomic. Queue submission happens afterward.
- Relay marks delivered only after Nest commits. Same event id/different payload hash is quarantined.
- Delivery is at least once and unordered across aggregates; consumers are idempotent and use tombstones for deletes.
- D1 owns auth/waitlist/credits/chat. Neon mirrors those domains for audit/MCP.
- Nest/Neon remains authoritative for résumé sync/projections.
- If Cloudflare is unavailable, edge writes fail closed; Postgres is never a fallback writer.

## Test strategy

- Postgres: local/real-Postgres tests for constraints, transactions, pool behavior, and `SKIP LOCKED`.
- Contract: Worker and Nest return identical status, body, pagination, and errors for shared routes.
- Edge: Miniflare/Wrangler tests for D1 races, finish-write failure, idempotency, quota guards, and outbox replay.
- Chat: bounded-history POST, new-device hydration, mid-stream reload, producer death, lease expiry, and cross-user isolation.
- E2E: invalid auth causes zero origin wakes; web/Nest/Cloudflare flows work through one origin.
- Recovery: ledger reconciliation, lost ACK replay, D1 Time Travel/R2 restore, and Neon projection rebuild.

## Rollout and rollback

- Use `edge | nest | shadow` per route. The frontend bundle does not change during owner moves.
- Before edge writes: flip back freely. After edge writes: keep edge authority and use outbox replay/compensation or a controlled data migration; never re-enable stale Nest writers.
- Keep old tables/contracts read-only for 30 days and revoke legacy direct-write credentials at cutover.
- Roll out auth, waitlist, credits, and chat separately. Never combine session cutover with DB migration.

## First tickets, in order

1. Create/confirm local Postgres role and database.
2. Add isolated Postgres schema/config/dependencies without changing SQLite exports.
3. Port auth + core sync/credit/waitlist schemas and Nest database module.
4. Port raw SQL/projection/admin queries and Better Auth provider.
5. Add local Postgres test harness and migrate all Nest tests.
6. Prove clean Nest production boot on Postgres; optionally prove Cloud Run container parity.
7. Fix web build and establish shared API contracts + one API origin.
8. Regenerate clients and pass web/Nest E2E on Postgres.
9. Add `apps/cloudflare` pass-through, IAM, and internal assertions.
10. Move Better Auth/me/viewer to D1.
11. Add outbox/inbox mirror, then D1 waitlist and credits.
12. Move chat to D1 with bounded history; make the DO decision only after measurements.
