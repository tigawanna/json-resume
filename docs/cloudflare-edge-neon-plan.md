# Cloudflare edge + Neon target architecture

Status: accepted sequence, 2026-11-27. Detailed execution lives in `docs/cloudflare-edge-neon-game-plan.md`.

## Migration order

1. Migrate Nest to Postgres and prove it locally.
2. Prove web and Nest work together through the REST contract.
3. Add `apps/cloudflare` and move auth behind it.
4. Move waitlist and credits to Cloudflare + D1.
5. Move chat to Cloudflare + D1 and only then evaluate Durable Objects.

Custom Durable Object work is paused. D1, Workers, and Postgres should carry the system as far as possible first.

## Target boundaries

- Cloudflare Worker is the public `/api` gateway.
- D1 is canonical for Better Auth, waitlist, credits, and durable chat history.
- Neon Postgres is canonical for résumé sync events and projections.
- Edge-domain events are mirrored to Neon for MCP, remote agents, analytics, and audit.
- Local Postgres proves Nest now; PGlite can be added later as an isolated fast-test optimization. Production keeps the existing custom `DRIZZLE` provider, backed by `drizzle-orm/node-postgres` and `pg` against Neon's pooled endpoint.
- The frontend keeps one `/api` origin. A route manifest and feature flags hide endpoint ownership.

## Topology

```text
Browser / SSR
  -> Cloudflare Worker: app.example.com
       /api/auth/*    -> Better Auth -> D1
       /api/me/*      -> D1 session/user projection
       /api/waitlist* -> D1
       /api/credits*  -> D1 guarded wallet/ledger
       /api/ai/*      -> Worker + D1 history -> model provider
       /api/sync/*    -> Google IAM + user assertion -> Nest
       /api/*         -> route manifest -> edge or Nest

Nest on Cloud Run -> Neon Postgres
  sync_event -> projection tables -> MCP/remote-agent read models
Cloudflare outbox/queue -> Nest internal event ingest -> Neon mirror
```

## Ownership

| Domain                                | Authoritative store | Read model                            |
| ------------------------------------- | ------------------- | ------------------------------------- |
| Auth users/accounts/sessions/API keys | D1                  | Indexed D1 + Better Auth cookie cache |
| Roles/bans/auth version               | D1                  | Worker session context                |
| Waitlist                              | D1                  | D1 indexes + Neon mirror              |
| Credit wallet/ledger                  | D1                  | Guarded D1 reads + Neon mirror        |
| Chat threads/messages/runs            | D1                  | D1 indexes + Neon mirror              |
| Résumé sync/projections               | Neon Postgres       | Projection tables/materialized views  |
| Local/offline chats                   | Browser storage     | Unchanged until explicit import       |

## D1-only credits

Use the simplest model that preserves invariants:

- `credit_wallet`, append-only `credit_ledger`, `credit_requests`, optional `credit_holds`, and `edge_outbox`.
- Every mutation has an operation id, request hash, stored response, and unique ledger reference.
- Use one guarded SQL operation or D1 `batch()` for idempotency, wallet update, ledger insert, and outbox insert.
- Enforce non-negative balances with SQL guards/constraints or triggers. Never read a balance, return to JavaScript, then debit in a separate request.
- Use integer minor units, `balance_after`, and periodic balance-versus-ledger reconciliation.
- Keep admin grants/adjustments on the same command API with mandatory actor, reason, and idempotency key.

If multi-bucket allocation, holds, or contention make D1-only too awkward, revisit `WalletDO(userId)` as a later optimization—not a prerequisite.

## D1-only waitlist

- Normalize identity at ingress.
- Use unique campaign/email/user constraints and command idempotency.
- Conditional claim updates and SQL quota guards arbitrate races.
- Write mutation and outbox in one D1 batch.
- Use `withSession("first-primary")` for decisions and read-your-writes.
- Add `CampaignDO(campaignId)` only if complex admission or quota ordering actually requires it.

## Chat persistence

1. Upgrade TanStack AI packages together and add `@tanstack/ai-persistence`.
2. Use `persistence: true` **and** `history: { pageSize: 50 }`; persistence alone still posts full history.
3. Implement app-owned D1 stores. Store normalized threads/messages/runs/interrupts/metadata, not one oversized JSON row.
4. Use a D1 active-run row/conditional lease for basic coordination. The Worker owns SSE; rejoin uses durable-stream resume or `reconstructChat`.
5. Commit chat state and outbox atomically. Producer death is handled by a reaper; replay restores output but does not restart computation.
6. Move conversation index/search/title state to D1 and import existing localStorage/OPFS chats idempotently.
7. Keep BYOK keys in headers, never D1/Postgres/logs.

Revisit a custom `ChatObject(userId, threadId)` only if concurrent runs, fencing, cancellation, or multi-device live state prove necessary. A durable-stream backend may use DOs internally without requiring a custom coordinator.

## Event mirroring

```text
{ eventId, source, type, version, userId, aggregateId, aggregateSeq, occurredAt, payload }
```

- Domain mutation and outbox commit atomically in D1.
- A relay leases rows and marks delivered only after Nest commits.
- Queue submission happens afterward; it is not part of the D1 transaction.
- Nest deduplicates by event id and quarantines same-id/different-hash payloads.
- Delivery is at least once and unordered across aggregates; preserve per-aggregate sequence numbers and tombstones.
- Postgres is a mirror for edge-owned domains, never a fallback writer.

## API contract stability

- `packages/api-contracts` owns shared Zod DTOs, errors, route metadata, and event schemas.
- Keep current `/api` paths stable; version only breaking changes.
- Generate clients from composed Nest + Worker OpenAPI or run the same contract suite against both.
- Route modes are `edge | nest | shadow`; shadow compares reads without dual-writing.

## Security and operations

- Better Auth runs in the Worker with opaque `__Host-` cookies and same-origin `SameSite=Lax`.
- Cloud Run requires a Google IAM ID token; Nest verifies a separate short-lived user assertion.
- Use `internal-and-cloud-load-balancing`, disable direct `run.app`, and add Cloud Armor.
- Secrets live in Cloudflare/Google secret managers. Private responses are not CDN-cached.
- Back up D1 with Time Travel and R2 exports; use Neon PITR/branches. Test projection rebuilds from outbox events.

## Cost guardrails

- Workers Paid is required for reliable Better Auth scrypt performance.
- D1 Free allows 5M row reads/day and 100k writes/day; Paid includes 25B reads and 50M writes/month.
- D1 bills rows scanned, not just returned rows. Index auth, waitlist, credit, chat, and outbox access paths.
- Set separate Workers, D1, Neon, and Cloud Run budgets. Alert on outbox lag, D1 rows scanned, negative wallets, and origin wakeups.
- Do not add DO spend until a measured coordination problem justifies it.

## References

- Cloudflare D1 batches: https://developers.cloudflare.com/d1/worker-api/d1-database/#batch
- Durable Objects, deferred: https://developers.cloudflare.com/durable-objects/
- Better Auth Cloudflare: https://better-auth.com/docs/guides/cloudflare
- TanStack AI persistence: https://tanstack.com/ai/latest/docs/concepts/persistence
- Neon pooling: https://neon.com/docs/connect/connection-pooling
- Drizzle PGlite: https://orm.drizzle.team/docs/connect-pglite
- Cloud Run ingress: https://cloud.google.com/run/docs/securing/ingress
