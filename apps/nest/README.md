# Nest API (`apps/nest`)

HTTP backend for **agentic-json-resume**. Nest owns Better Auth, Postgres access, API secrets, managed sync, credits/waitlist, admin tooling, hosted AI streams, and the external agentic (oRPC) surface. The web app talks to it over cookies via a Kubb client generated from Nest’s OpenAPI document.

This process is **not** proxied through the web app (`:3040`) or Hono (`:3100`). Hit Nest directly on `PORT` (default **5040**).

| Owns | Lives in |
| ---- | -------- |
| Tables, relations, SQL migrations | `packages/db` |
| Credit / waitlist policy constants | `packages/isomorphic` |
| HTTP, guards, Better Auth mount, sync, AI, admin | `apps/nest` |

## What it serves

| Area | Routes (prefix `/api` unless noted) | Notes |
| ---- | ----------------------------------- | ----- |
| Auth | `/api/auth/*`, `/me`, `/viewer` | Better Auth (email/password, GitHub, admin, orgs, API keys, JWT) |
| Waitlist & credits | `/waitlist`, `/credits` | Join/claim; wallet + ledger; résumé spend when `CREDITS_ENABLED=true` |
| Managed sync | `/sync/events`, `/sync/compact` | Device event push/pull and compaction proposals |
| Public résumés | `/public-resumes` | Published snapshots |
| GitHub | `/github` | Search / list for import flows |
| Legacy import | library + résumé controllers | Migrated remote-library reads |
| Admin | `/admin/*` | Stats, users, waitlist, credits, table browser, event-log — see [docs/admin.md](docs/admin.md) |
| AI | `/ai/*` | SSE dashboard / résumé chat (TanStack AI + OpenRouter) |
| Agentic | `/agentic/*` | oRPC + its own OpenAPI/Scalar for external agents |
| Probes | `GET /health`, `GET /ready` | Root paths, outside `/api` and OpenAPI |

Auth, waitlist, credits, rate limits, and sync details: [docs/auth-waitlist-credits.md](docs/auth-waitlist-credits.md).

## Setup

```bash
# from repo root
pnpm install
cp apps/nest/.env.example apps/nest/.env   # fill secrets; see comments in the file
pnpm --dir apps/nest db:migrate:postgres
pnpm --dir apps/nest dev
```

Dev scripts load `apps/nest/.env`. Missing keys can fall back to `apps/web/.env` in development. Schema changes are generated and applied from `packages/db` — Nest does not run Drizzle Kit or migrate at boot.

| Script | Purpose |
| ------ | ------- |
| `pnpm --dir apps/nest dev` | Watch mode |
| `pnpm --dir apps/nest start` | One-shot start |
| `pnpm --dir apps/nest start:prod` | `node dist/main` after `build` |
| `pnpm --dir apps/nest db:migrate:postgres` | Apply Postgres migrations |
| `pnpm --dir apps/nest test` / `test:e2e` | Vitest unit / e2e |

## OpenAPI & web client

No checked-in OpenAPI file; Nest builds the document at boot (`src/bootstrap/configure-app.ts`).

| What | Path | Example (`PORT=5040`) |
| ---- | ---- | --------------------- |
| Scalar UI | `/api/docs` | http://localhost:5040/api/docs |
| OpenAPI JSON | `/api/docs-json` | http://localhost:5040/api/docs-json |

OpenAPI `servers` is `SERVER_URL/api`, so Scalar lists paths like `/me` against that base. Better Auth’s `/api/auth/*` schema is merged into the same document.

From the web app, with Nest running:

```bash
pnpm --dir apps/web gen:api
```

That regenerates `apps/web/src/services/nest/generated/` from the live document (`NEST_OPENAPI_URL` optional). Browser origin is `VITE_API_ORIGIN` (default `http://localhost:5040`).

## Auth model (short)

Routes are **authenticated by default** (`AppAuthGuard`). Use `@Public()` for anonymous access and `@Roles({ roles: ['admin'] })` for admin. Banned users get 403. Feature gates (`WaitlistGuard`, `CreditsGuard`) run after the session guard.

E2e overrides `MOCK_AUTH` and sends `x-mock-user: <user id>` (role comes from the DB row). Dev-only: `ADMIN_BYPASS_SECRET` + `x-admin` header for a synthetic admin — refused in production.

Global rate limiting uses `ThrottlerGuard` with counters in `rate_limit_counter` (shared across instances). Default 100/min; features can tighten with `@Throttle`.

## Tests

```bash
pnpm --dir apps/nest test
pnpm --dir apps/nest test:e2e
pnpm --dir apps/nest test:cov
```

Most e2e specs use an empty migrated Postgres database plus `personas` fixtures. The `admin-real-data-*.e2e-spec.ts` suites boot against a clone of a migrated snapshot: set `NEST_TEST_POSTGRES_URL` (role that can create databases) and `NEST_TEST_POSTGRES_SOURCE` (snapshot URL). Each suite creates and drops its own clone; auth still uses `x-mock-user` against a real user row.

## Deployment

Build once, run `node dist/main` (`pnpm start:prod`). Set `NODE_ENV=production`, `POSTGRES_URL`, `POSTGRES_POOL_MAX`; listen on `PORT` and bind `0.0.0.0` in a container. Migrate **before** starting the new version:

```bash
pnpm --dir apps/nest db:migrate:postgres
```

`main.ts` handles `SIGTERM`/`SIGINT`, closes the Nest app and Postgres pool, and force-exits before an 8s deadline. Idle sockets stay open 65s so a load balancer with a longer idle timeout does not see resets. Point liveness at `/health` and readiness at `/ready` (503 during shutdown).

Throttler counters share `rate_limit_counter`, so multiple instances share one budget. Set `CREDITS_ENABLED=true` for résumé charges; otherwise production logs a warning at boot and every résumé is free. Keep web’s `VITE_CREDITS_ENABLED` aligned.

## Observability

[NestJS Observe](https://observe.nestjs.com) is wired in `AppModule` and turns on in `production` when both `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` are set. Outside production, or without keys, it records nothing.

```bash
npx @nestjs/observe link   # writes the key pair into .env
```

`/health` and `/ready` are excluded from traces.
