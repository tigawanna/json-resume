# Nest auth, waitlist, credits, and sync

This is the plan for `apps/nest`. Schema and migrations stay in `packages/db`. The Nest app owns the HTTP surface, including managed sync push/pull and compaction.

## Boundaries

| Owns                                  | Location                                |
| ------------------------------------- | --------------------------------------- |
| Tables, relations, SQL migrations     | `packages/db`                           |
| Credit amounts and `requireWaitlist`  | `packages/isomorphic` `CREDIT_POLICY`   |
| HTTP, guards, Better Auth mount, sync | `apps/nest`                             |
| Scheduled/incremental sync compaction | Follow-up; manual compaction is in Nest |

`apps/nest` does not run Drizzle Kit. Generate and apply Postgres SQL from `packages/db` (`pnpm --dir packages/db db:generate:postgres` / `db:migrate:postgres`).

`drizzle-orm`, `drizzle-zod`, and `drizzle-kit` are catalog entries in `pnpm-workspace.yaml`. `apps/api`, `apps/web`, `apps/nest`, and `packages/db` depend on `catalog:`. There is no `link:` dependency and no Prisma package. Prisma was only an optional peer that a failed install materialized; it is not part of this app.

The runtime client is `drizzle-orm/node-postgres` with `pg.Pool`. It uses `POSTGRES_URL` and `POSTGRES_POOL_MAX`. Tests create isolated Postgres databases through `NEST_TEST_POSTGRES_URL`, run the Postgres migrations, and override the `DRIZZLE` provider. Real-data suites clone `NEST_TEST_POSTGRES_SOURCE`.

## OpenAPI (Scalar)

`configureApp` in `src/bootstrap/configure-app.ts` is called from `main.ts` and from the test app.

- Scalar UI: `/api/docs`
- OpenAPI JSON: `/api/docs-json`
- Nest routes use global prefix `/api`. Better Auth is already `/api/auth` and is not prefixed again.
- Document `servers` is `SERVER_URL` plus `/api` (default `http://localhost:5040/api`). Paths in Scalar are relative to that (`/me`, `/auth/sign-in/email`), matching the HTTP routes `/api/me` and `/api/auth/sign-in/email`.
- `ZodValidationPipe` and `ZodSerializerInterceptor` are registered here, because the testing app never runs `main.ts`
- `cleanupOpenApiDoc` from `nestjs-zod` runs on the document factory
- Better Auth `openAPI({ disableDefaultReference: true })` schema is merged into the same document (`/api/auth/*` paths). Nest already uses Scalar, so Better Auth's own `/api/auth/reference` UI stays off.
- Cookie auth is documented. Do not document the test header as a public scheme

The app runs on `NodeAdapter` (`@nestjs/platform-node` / `node:http`), not Express. Nest's body parser is off (`bodyParser: false`) so Better Auth can read the raw body. `@thallesp/nestjs-better-auth` parses JSON for the other routes. Trust proxy is `loopback` on the adapter (NodeAdapter does not take an Express hop count).

## Better Auth

`AuthModule.forRootAsync` from `@thallesp/nestjs-better-auth` builds the instance with the injected Drizzle client and `ConfigService`.

Mirrored from `apps/api`:

- Drizzle adapter, Postgres, `packages/db` Postgres auth tables
- Email and password
- GitHub provider
- Plugins: `admin`, `organization` (shared access control), `multiSession`, API keys, ES256 JWT
- Base path `/api/auth`
- Cross-site cookies: `sameSite: none`, `secure: true`

The library's global `AuthGuard` is disabled. `AppAuthGuard` is the global guard (`APP_GUARD` via `useExisting`, so tests can replace it). The library still mounts `/api/auth/*` and exposes `AuthService`.

`AppAuthGuard` rules, in order:

1. Load a user when one is present.
2. `@Public()` routes continue even when no user is present. A user is still attached when the request has one, so waitlist join can link a session.
3. Otherwise missing user is 401.
4. `banned` is 403. A banned admin stays banned.
5. `@Roles({ roles: ['admin'] })` checks `user.role`. Values may be a comma-separated list. The role is read from the database or the Better Auth session, never from a client-supplied role header.

`GET /api/me` returns `id`, `name`, `email`, `role`, `banned`. No password, token, or account row.

`GET /api/viewer` returns the full Better Auth payload (`{ user, session }`) used by the web app. Better Auth's `GET /api/auth/get-session` remains available for clients that prefer the generated auth client.

`GET /api/admin/session` is only a role probe so the guard can be tested. It is not an admin product API.

## Mock users

`MOCK_AUTH` is `false` in the app. The e2e harness overrides it to `true`.

While it is true, `x-mock-user: <user id>` loads that row from the database. The header does not carry a role. Tests insert the rows, including `role` and `banned`, and insert `waitlist_entry` for the waitlisted personas. An unknown id is 401. A blank header is treated as signed out.

Personas: `member`, `memberWaitlisted`, `admin`, `adminWaitlisted`, `banned`, `bannedAdmin`, `noRole`, `multiRole` (`admin,user`).

Production never turns `MOCK_AUTH` on. A client cannot become an admin by sending the header.

## Dev admin bypass

Outside production, `ADMIN_BYPASS_SECRET` in env enables header `x-admin`. When the header matches the secret, the guard attaches a synthetic admin (`dev-admin-bypass`). Set the same value in Postman. `NODE_ENV=production` refuses the env var at boot and the factory never injects the secret.

## Rate limiting

`RateLimitModule` is imported in `AppModule` **after** `AuthenticationModule`. `ThrottlerGuard` is a global `APP_GUARD` (`useExisting`, so tests can replace it). Counters are per route and per tracker: `user:<id>` when `request.user` is set, otherwise `ip:<req.ip>`. Over the limit is 429 with `Retry-After`.

`DbThrottlerStorage` keeps counters in the shared `rate_limit_counter` table (migration `0020`), so every instance enforces the same budget. Apply that migration as a release step before the app boots.

The module default is `HTTP_RATE_LIMIT` (`src/rate-limit/rate-limit.constants.ts`: 100 per minute). Tune per controller or handler; do not add another `ThrottlerModule.forRoot`.

```ts
@Throttle({
  default: { limit: WAITLIST_RATE_LIMIT.limit, ttl: WAITLIST_RATE_LIMIT.ttlMs },
})
@Controller("waitlist")
export class WaitlistController {}
```

- Class `@Throttle`: every handler on that controller.
- Method `@Throttle`: one route only (overrides the class).
- `@SkipThrottle()`: opt out (health-style routes).

Waitlist uses `WAITLIST_RATE_LIMIT` (5 per minute) in `src/waitlist/waitlist.constants.ts`. `/api/auth/*` and Scalar `/api/docs` are not Nest handlers, so they are not counted.

E2e calls `createTestApp({ throttle: true })` only when asserting 429. Other tests replace `ThrottlerGuard` with `{ canActivate: () => true }`.

## Waitlist

`POST /api/waitlist` is public and always answers `{ joined: true }` with status 200, including duplicates and the honeypot (`website` filled). That avoids email enumeration.

- Email is trimmed and lowercased.
- `consent` must be `true`.
- `source` is `landing`, `waitlist-page`, or `dashboard`.
- If the signed-in user's email matches and they are not banned, the entry stores `userId` and `claimedAt`.
- After that link, credits run the monthly allocation. Banned users are not eligible. With `requireWaitlist: false` (the shared policy today) a linked signed-in user receives `monthlyCredits` (20). With `requireWaitlist: true`, only a `joined` entry makes them eligible.

`POST /api/waitlist/claim` requires a session. It links an unclaimed entry for the session email and then allocates. `{ claimed: false }` when there is nothing to link. It never overwrites an existing `userId`.

## Credits

`GET /api/credits` requires a session. It runs the same lazy monthly allocation as `apps/api` (no cron):

- Create the wallet if missing.
- Same `YYYY-MM` period: do nothing.
- New period: expire unused monthly credits, then grant `CREDIT_POLICY.monthlyCredits` when eligible, else set the monthly bucket to 0.
- Bonus balance is left alone.
- Ledger idempotency keys match the API (`monthly-grant:<userId>:<period>`, `monthly-expiry:<userId>:<period>`).

`CREDITS_POLICY` is a provider defaulting to the shared constant. Tests override `requireWaitlist` without editing the package.

The response is `{ monthly, bonus, available, monthlyPeriodKey, resetsAt, waitlistJoined, policy }`.

`POST /api/credits/checks` allocates without spending and returns `{ available, monthly, bonus, resetsAt }`. `GET /api/credits/ledger` is offset-paginated and includes the current `periodKey`.

Résumé spend and overdraft are implemented in projection: one idempotent `resume_spend` per new résumé, monthly balance before bonus, with `CREDITS_START_AT` grandfathering and amount-0 `resume_overdraft` instead of dropping data. Charging only runs when `CREDITS_ENABLED=true`; without it the wallet is still allocated and displayed, and production logs a warning at boot. Keep the web app's `VITE_CREDITS_ENABLED` in sync.

## Managed sync

`POST /api/sync/events` accepts an array of outbound device events. It:

- stamps `userId` from the session, never the body;
- scopes every projected write to that owner: `id` and `user_id` come from the event row, the delete has an owner predicate, and the upsert's `WHERE user_id = excluded.user_id` stops a caller taking over another user's row by id;
- retries a failed projection up to three times per batch before stamping it, so a poison event cannot block the log forever;
- groups by `txId` and writes each group in one transaction;
- deduplicates retries on `eventId`;
- acks local-only AI collections without storing them (`globalSeq: 0`);
- rejects reserved reset markers with `RESERVED_COLLECTION`;
- projects newly stored events after the batch.

The response is `{ confirmed: [{ eventId, globalSeq }], failed? }`.

`GET /api/sync/events?since=N` returns up to 200 rows or 3.5 MB for the signed-in user, excluding local-only and reset events. It reports `{ events, cursor, hasMore, backendId }`. The backend id is suffixed with the user's latest reset sequence so rebuilt logs force a device reload.

`POST /api/sync/compact` accepts a device-planned proposal. It returns `{ status: "accepted", events }` only when the user's log has not advanced past `baseSeq`; otherwise `{ status: "stale" }`.

All three routes use the global session guard: 401 without a session and 403 for a banned user.

## Tests

`test/auth.conditions.e2e-spec.ts` covers 20 auth conditions against `/api`, `/api/me`, and `/api/admin/session` using the personas above.

`test/waitlist-credits.e2e-spec.ts`:

- Anonymous join stores a row and does not grant credits
- Honeypot does not write
- Signed-in join links the user and grants 20 credits
- Duplicate join stays `{ joined: true }`
- Claim links an existing entry
- `GET /api/credits` reports the grant
- `POST /api/sync/events` without a user is 401
- Signed-in push and pull round-trip an event (`test/sync-events.e2e-spec.ts`)
- Compaction proposals are accepted once, then stale
- With `requireWaitlist: true`, only a waitlisted user receives monthly credits
- A banned user is 403

`test/sync-ownership.e2e-spec.ts` covers cross-user update and delete attempts. `test/health.e2e-spec.ts` covers the root probes.

## Production bootstrap

- `GET /health` (liveness, no database) and `GET /ready` (database check) are at the **root**, excluded from the `/api` prefix, `@Public()` and `@SkipThrottle()`, and hidden from OpenAPI. `/ready` answers 503 once shutdown begins.
- `main.ts` calls `app.enableShutdownHooks()` and sets `keepAliveTimeout=65_000` / `headersTimeout=66_000` so a load balancer with a longer idle timeout does not get connection resets.
- Observe turns on by itself in production when both `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` are set; probes are excluded from traces. Without keys it stays off.
- Apply migrations as a release step (`pnpm --dir packages/db db:migrate:postgres`, or `pnpm --dir apps/nest db:migrate:postgres`) — the app does not migrate at boot.

## Follow-up sync work

These are intentionally not in the first Nest sync pass:

- Scheduled/incremental squash and cron wiring
- Idempotency keys on résumé creates
- Gateway JWT enforcement (the cookie session is authoritative in Nest)
