# Nest auth, waitlist, credits, and sync

This is the plan for `apps/nest`. Schema and migrations stay in `packages/db`. The Nest app only opens a libSQL HTTP connection and reads that schema. Sync handlers stay empty on purpose.

## Boundaries

| Owns                                        | Location                                                     |
| ------------------------------------------- | ------------------------------------------------------------ |
| Tables, relations, SQL migrations           | `packages/db`                                                |
| Credit amounts and `requireWaitlist`        | `packages/isomorphic` `CREDIT_POLICY`                        |
| HTTP, guards, Better Auth mount             | `apps/nest`                                                  |
| Sync projection, compaction, résumé charges | Not in this pass. `POST /sync` and `GET /sync` return a stub |

`apps/nest` does not run Drizzle Kit. Generate and apply SQL from `packages/db` (`pnpm --dir packages/db db:generate` / `db:migrate`).

`drizzle-orm`, `drizzle-zod`, and `drizzle-kit` are catalog entries in `pnpm-workspace.yaml`. `apps/api`, `apps/web`, `apps/nest`, and `packages/db` depend on `catalog:`. There is no `link:` dependency and no Prisma package. Prisma was only an optional peer that a failed install materialized; it is not part of this app.

The runtime client is `drizzle-orm/libsql/web` (HTTP). It uses `DATABASE_URL` (`libsql://`, `https://`, or `http://`) and `DATABASE_AUTH_TOKEN`. Tests do not call that server. They open `@libsql/client` with `:memory:`, run the shared migrations, and override the `DRIZZLE` provider. The HTTP driver cannot open a file or memory database.

## OpenAPI (Scalar)

`configureApp` in `src/bootstrap/configure-app.ts` is called from `main.ts` and from the test app.

- Scalar UI: `/docs`
- OpenAPI JSON: `/docs-json`
- `ZodValidationPipe` and `ZodSerializerInterceptor` are registered here, because the testing app never runs `main.ts`
- `cleanupOpenApiDoc` from `nestjs-zod` runs on the document factory
- Cookie auth is documented. Do not document the test header as a public scheme

Nest's body parser is off (`bodyParser: false`) so Better Auth can read the raw body. `@thallesp/nestjs-better-auth` parses JSON for the other routes.

## Better Auth

`AuthModule.forRootAsync` from `@thallesp/nestjs-better-auth` builds the instance with the injected Drizzle client and `ConfigService`.

Mirrored from `apps/api`:

- Drizzle adapter, SQLite, `packages/db` auth tables
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
5. `@Roles(['admin'])` checks `user.role`. Values may be a comma-separated list. The role is read from the database or the Better Auth session, never from a client-supplied role header.

`GET /me` returns `id`, `name`, `email`, `role`, `banned`. No password, token, or account row.

`GET /admin/session` is only a role probe so the guard can be tested. It is not an admin product API.

## Mock users

`MOCK_AUTH` is `false` in the app. The e2e harness overrides it to `true`.

While it is true, `x-mock-user: <user id>` loads that row from the database. The header does not carry a role. Tests insert the rows, including `role` and `banned`, and insert `waitlist_entry` for the waitlisted personas. An unknown id is 401. A blank header is treated as signed out.

Personas: `member`, `memberWaitlisted`, `admin`, `adminWaitlisted`, `banned`, `bannedAdmin`, `noRole`, `multiRole` (`admin,user`).

Production never turns `MOCK_AUTH` on. A client cannot become an admin by sending the header.

## Dev admin bypass

Outside production, `ADMIN_BYPASS_SECRET` in env enables header `x-admin`. When the header matches the secret, the guard attaches a synthetic admin (`dev-admin-bypass`). Set the same value in Postman. `NODE_ENV=production` refuses the env var at boot and the factory never injects the secret.

## Waitlist

`POST /waitlist` is public and always answers `{ joined: true }` with status 200, including duplicates and the honeypot (`website` filled). That avoids email enumeration.

- Email is trimmed and lowercased.
- `consent` must be `true`.
- `source` is `landing`, `waitlist-page`, or `dashboard`.
- If the signed-in user's email matches and they are not banned, the entry stores `userId` and `claimedAt`.
- After that link, credits run the monthly allocation. Banned users are not eligible. With `requireWaitlist: false` (the shared policy today) a linked signed-in user receives `monthlyCredits` (20). With `requireWaitlist: true`, only a `joined` entry makes them eligible.

`POST /waitlist/claim` requires a session. It links an unclaimed entry for the session email and then allocates. `{ claimed: false }` when there is nothing to link. It never overwrites an existing `userId`.

## Credits

`GET /credits` requires a session. It runs the same lazy monthly allocation as `apps/api` (no cron):

- Create the wallet if missing.
- Same `YYYY-MM` period: do nothing.
- New period: expire unused monthly credits, then grant `CREDIT_POLICY.monthlyCredits` when eligible, else set the monthly bucket to 0.
- Bonus balance is left alone.
- Ledger idempotency keys match the API (`monthly-grant:<userId>:<period>`, `monthly-expiry:<userId>:<period>`).

The response is `{ monthly, bonus, available, monthlyPeriodKey, waitlistJoined }`.

`CREDITS_POLICY` is a provider defaulting to the shared constant. Tests override `requireWaitlist` without editing the package.

This pass does not port admin grants, résumé spend, or overdraft. Those stay in `apps/api` until sync is implemented.

## Sync stub

`GET /sync` and `POST /sync` have no projection, no writes, and no credit charge. Both return:

```json
{ "status": "accepted", "implementation": "pending" }
```

Guards on both routes:

| Guard           | Condition                                  | Status |
| --------------- | ------------------------------------------ | ------ |
| `AppAuthGuard`  | No session                                 | 401    |
| `AppAuthGuard`  | Banned                                     | 403    |
| `WaitlistGuard` | `requireWaitlist` and no joined entry      | 403    |
| `CreditsGuard`  | After allocation, `available < resumeCost` | 402    |

`CreditsGuard` does not decrement the wallet. The charge belongs in the sync work that still needs review. A successful stub leaves the balance unchanged.

When `requireWaitlist` is false, `WaitlistGuard` allows every signed-in user, and allocation still grants the monthly credits.

## Tests

`test/auth.conditions.e2e-spec.ts` covers 20 auth conditions against `/`, `/me`, and `/admin/session` using the personas above.

`test/waitlist-credits.e2e-spec.ts`:

- Anonymous join stores a row and does not grant credits
- Honeypot does not write
- Signed-in join links the user and grants 20 credits
- Duplicate join stays `{ joined: true }`
- Claim links an existing entry
- `GET /credits` reports the grant
- `POST /sync` without a user is 401
- Signed-in `POST /sync` is the stub and does not change the balance
- With `requireWaitlist: true`, a user who has not joined is 403 and a waitlisted user is accepted
- A banned user is 403

## Left for the sync pass

Do not fill these in until the sync design is reviewed:

- Event ingest, squash, compaction
- `spendResumeCredit` / overdraft
- Idempotency keys on résumé creates
- JWT authorizer for desktop clients
- Charging inside `POST /sync` (the guard only checks that a credit exists)
