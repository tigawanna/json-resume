# Converting the Hono API to Effect (RPC + Drizzle) — findings

## Context

`apps/api` is currently Hono + Hono RPC (`hc<AppType>`) + Better Auth + Drizzle/libsql, with evlog logging. This note captures what an Effect-based rewrite would look like, what it gains/loses, and whether it's worth doing now. **No code changes are implied by this file — it's a decision document.**

Reference reading (in priority order):

- `/home/dennis/Desktop/code/fullstack/tangerine` — current Hono blueprint we already mirror.
- Effect docs: https://effect.website (v3 stable; v4 is mid-beta).
- Drizzle Effect docs: https://orm.drizzle.team/docs/connect-effect-postgres (and the SQLite/libSQL Effect driver notes).
- `@effect/rpc`: https://www.npmjs.com/package/@effect/rpc
- `@effect/platform` HttpApi: https://effect.website/docs/v3/api/platform/HttpApi

## 1. What "Effect RPC" would replace Hono RPC with

Effect offers two overlapping ways to get typed RPC over HTTP:

1. **`@effect/platform` `HttpApi`** — define an API as a schema (routes, params, payloads, errors) using Effect `Schema`, then implement handlers as Effect programs. Client is generated via `HttpApiClient`. Transport is plain HTTP; integrates with the Effect runtime, layers, and typed errors.
2. **`@effect/rpc` (`RpcGroup` + `RpcServer`)** — define request/response pairs as `Rpc` values, serve them over HTTP or WebSocket, client via `RpcClient`. Supports streaming and bidirectional transports.

Both give end-to-end type safety like Hono RPC, but the type-safety comes from Effect `Schema` definitions (decoded/encoded at the boundary) rather than from TypeScript inference over a chained Hono expression. That means:

- Inputs/outputs are validated and decoded automatically (no manual `zValidator`).
- Errors are typed and part of the contract (`Rpc`/`HttpApi` error channel).
- Handlers return `Effect<A, E, R>` instead of `Promise`, so dependencies (DB, auth, config) are declared via the `R` (requirements) channel and provided by Layers.

Client side: `HttpApiClient.make(Api)` / `RpcClient.make(Group)` instead of `hc<AppType>`. React Query wrappers would call `Effect.runPromise(program)`.

## 2. What "Effect Drizzle" would replace our Drizzle client with

Drizzle 1.0 RC has first-class Effect support; `@effect/sql-drizzle` (and `@effect/sql-libsql` for libSQL/Turso) provide:

- A Drizzle instance created inside an Effect Layer (e.g. `PgDrizzle.makeWithDefaults()` / the libSQL equivalent), so the DB handle is a service.
- Queries return `Effect` (not Promise), composable with `Effect.gen`, retries, transactions, and typed errors.
- Migrations and schema stay identical — only the _execution_ layer changes. Our `packages/db` schemas (Drizzle table definitions) remain valid.

Caveats we hit in research:

- `@effect/sql-drizzle` has had type incompatibilities with `drizzle-orm 0.45.x` (see Effect-TS/effect#5904). Our repo is on `0.45.2`. Drizzle 1.0 RC targets Effect v4. Until both stabilize, expect friction.
- Effect v4 is mid-beta; Effect v3 is the stable line but its Drizzle integration is thinner.
- `@libsql/client` (our Turso driver) needs `@effect/sql-libsql` or a custom `SqlClient` layer — check availability for the exact version before committing.

## 3. What does NOT have an Effect-native equivalent (the hard parts)

- **Better Auth** is Promise/callback based and owns its own DB adapter (Drizzle). It cannot be expressed as an Effect service without a wrapper. We would keep Better Auth as-is and call `auth.api.*` inside `Effect.tryPromise`, treating it as an external boundary. That's fine but loses the "everything is Effect" purity.
- **evlog** logging would be replaced by Effect's `Logger`/tracing, or kept as a side-effect inside handlers. Mixing both is noisy.
- **TanStack Start server functions** we're already leaving behind; no change there.
- **Streaming (SSE) AI endpoints** work in Effect (`Stream`), but re-plumbing `toServerSentEventsResponse` → Effect streams is real work.

## 4. Gains vs. costs

Gains:

- Typed error channel (no more `if (!res.ok) throw …` at every call site; failures are part of the RPC contract).
- Dependency injection via Layers (DB, auth, config) — easier to test with in-memory layers.
- Composability for the complex admin/sync flows (transactions, retries, parallelism).
- Effect's tracing/observability instead of hand-rolled evlog.

Costs:

- Large rewrite of `apps/api` (handlers, middleware, error mapping, client).
- Team must learn Effect's runtime, Layers, and Schema; steep curve.
- 0.x package churn: `@effect/rpc`, `@effect/platform`, `@effect/sql-*` take breaking changes on minor bumps; Effect v4 mid-beta means a future migration.
- Better Auth stays a Promise boundary, so the "pure Effect" story is partial.
- Our Hono RPC setup already works and is type-safe; the marginal gain is mostly ergonomics + observability.

## 5. Recommendation

**Do not rewrite now.** Keep Hono + Hono RPC as the backend standard (per `AGENTS.md`). Revisit Effect when:

1. Effect v4 ships stable and `@effect/sql-drizzle` stabilizes against Drizzle 1.0.
2. The team has appetite for a Layer-based architecture.
3. We need the typed-error/observability wins badly enough to justify the rewrite.

If we want to _evaluate_ Effect without committing, do a **spike** in a single isolated service:

- Pick one low-risk resource (e.g. `health` + a read-only `viewer`-style endpoint) and reimplement it in a parallel `apps/api-effect` (or a feature branch) using `HttpApi` + `@effect/sql-libsql` + a Layer for the DB.
- Keep Better Auth as a `tryPromise` boundary.
- Measure: bundle size, cold start, latency vs. Hono, and developer ergonomics.
- Decide go/no-go before touching the rest.

## 6. If we ever do it: migration sketch

1. Add deps: `effect`, `@effect/platform`, `@effect/platform-node`, `@effect/rpc`, `@effect/sql`, `@effect/sql-libsql`, `@effect/sql-drizzle`, `@effect/schema` (or `effect/Schema`).
2. Move `packages/db` schemas unchanged; create a `DbLayer` providing a Drizzle instance via `@effect/sql-libsql`.
3. Define `HttpApi` (or `RpcGroup`) mirroring the route table in `todos/port-to-hono.md`.
4. Implement handlers as `Effect.gen` programs; provide `DbLayer` + a `AuthLayer` (wrapping Better Auth).
5. Serve via `HttpApiBuilder.serve` (Node) or mount on the existing Node server; keep `app.fetch` for Vercel.
6. Replace `honoClient` with `HttpApiClient.make(Api)` / `RpcClient.make(Group)` in `apps/web/src/lib/api/client.ts`; keep React Query wrappers, swapping `Promise` for `Effect.runPromise`.
7. Migrate endpoint-by-endpoint using the same checklist as the Hono port; keep both running behind a feature flag until parity.

## 7. Open questions to resolve before deciding

- Does `@effect/sql-libsql` exist for our libSQL version, or do we need a custom `SqlClient`?
- Effect v3 vs v4: which line does `@effect/sql-drizzle` target today, and does it match our Drizzle 0.45.x?
- How does Better Auth's cookie/session flow interact with Effect's request context (`HttpServerRequest`)?
- Vercel/Node serverless cold-start cost of the Effect runtime vs. Hono.
- Whether to keep evlog or adopt Effect tracing entirely.

## Bottom line

Effect is a compelling _next_ architecture, but it is not a drop-in replacement and the ecosystem is still stabilizing (Effect v4 beta, Drizzle 1.0 RC, 0.x Effect packages). **Recommendation: stay on Hono RPC for the migration tracked in `todos/port-to-hono.md`, and run a small isolated Effect spike later to gather real data before any commitment.**
