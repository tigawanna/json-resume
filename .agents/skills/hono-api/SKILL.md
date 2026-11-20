---
name: hono-api
description: >-
  Build or change the Hono RPC API in apps/api. Use when adding routes,
  middleware, auth, env, Drizzle access, error bodies, the hc client, cookies
  or origins, or when migrating createServerFn, src/routes/api, or *.server.ts
  code into apps/api.
---

# Hono API (`apps/api`)

Backend logic lives in `apps/api/` (Hono on Node, Better Auth, Drizzle/libsql). The web app is UI only and talks to it through a typed `hc<AppType>` client. Do not add new `createServerFn` handlers, `src/routes/api/*` route files, or `*.server.ts` data-access code. When a task touches legacy server code, migrate that piece instead of extending it.

## Layout

```
apps/api/src/
  app.ts                 # composition root: container + one chained Hono -> AppType
  index.ts               # node serve entry (Vercel uses app.fetch)
  env.ts                 # zod-validated env
  core/di/               # class container (`static inject` + bind roots)
  core/db/db.service.ts  # injectable Drizzle handle
  core/auth/auth.service.ts
  db/client.ts           # drizzle client (schema from @repo/db); still used by unmigrated routes
  auth/auth.ts           # Better Auth (no tanstackStartCookies)
  auth/middleware.ts
  modules/<name>/
    <name>.controller.ts
    <name>.service.ts
    schema.ts            # when more than one handler shares zod
    tests/               # service + HTTP tests; do not drop *.test.ts next to impl
  routes/<resource>/     # leftover HTTP until migrated into modules/
  lib/                   # http error helpers
```

New HTTP lives in `modules/<name>/`. `app.ts` is still the mount list: resolve the controller and `.route("/<name>", controller.routes)`. Do not auto-register controllers — that hides route types. Do not glue separate `new Hono()` apps together inside a function, and do not `app.use()` a nested handler. `basePath("/api")` is part of the type, so the client calls `honoClient.api.health.$get()`.

```ts
const container = createAppContainer({ db, auth });
const health = container.resolve({ token: HealthController });
const me = container.resolve({ token: MeController });

return new Hono<EvlogVariables>()
  .basePath("/api")
  .use("*", evlog({ ... }))
  .use("*", cors({ origin, credentials: true }))
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/health", health.routes)
  .route("/me", me.routes)
  .onError((err, c) => errorResponse({ c, err, isProduction }));
```

Controllers are HTTP only (middleware, `zValidator`, `c.json`). They take injected services via `static readonly inject = { me: MeService }` and expose `readonly routes` as a **chained** `new Hono<AppEnv>().get(...).patch(...)` (a `createXxxRoutes` helper in the same file is fine if it preserves the chain type).

Services hold business rules and talk to `DbService` / `AuthService`. They take one named constructor object. Tests construct them with fakes; they should not import the process-wide `db` / `auth` proxies.

`createApp` binds `DbService` and `AuthService` on a fresh container. Keep `setDb` / `setAuth` until remaining `src/routes/` modules are migrated.

## Generate CLI

Scaffold from `apps/api`. `resource` / `module` writes the folder, service, controller, tests, and an **explicit** `.route()` plus `container.resolve` in `src/app.ts`. Do not invent an AppModule registry.

```
pnpm --dir apps/api generate resource notes
pnpm --dir apps/api generate service notes
pnpm --dir apps/api generate controller notes --mount
```

Names are kebab-case. Extra controllers in an existing module omit `--mount` unless they need their own `/api/<name>` path.

## File size

Keep every file under `apps/api` at 150 lines or fewer. A file that would pass that limit is a signal to split it before finishing the change. Breaking a large file into smaller ones is the expected shape, not a later cleanup.

- One module owns one resource. When a controller grows, split handlers into sibling files and keep a short chained `routes` export.
- Put zod schemas next to the handler that uses them, or in `modules/<name>/schema.ts` when more than one handler shares them.
- Shared HTTP helpers stay in `lib/` as small named modules. Do not grow a single helpers file past the limit.
- `app.ts` stays the mount list. New behavior goes in the module folder, not into `app.ts`.
- Tests live in `modules/<name>/tests/`.

## HTTP tests

HTTP tests use `apiClient` from `@api/core/testing/api-client` (Hono `testClient(app)`). Call the same RPC paths as the web `honoClient`. Narrow with `res.ok` before `await res.json()`. Session cookies go through `sessionInit({ cookie })`.

Better Auth is mounted with `.on("/auth/*")` and OIDC lives outside `/api`, so they are not on `AppType`. Use `authSignUpRequest` for email signup and `app.request` only for `/api/auth/*`, `/.well-known/*`, and unknown-path 404s.

```ts
import { apiClient } from "@api/core/testing/api-client";
import { describe, expect, it } from "vitest";

describe("HealthController", () => {
  it("GET /api/health returns 200 with status ok", async () => {
    const res = await apiClient.api.health.$get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "ok",
      service: "agentic-json-resume-api",
    });
  });
});
```

Service tests stay unit tests: `new FooService({ auth: fake })`. They do not use `apiClient`.

## Route rules

- Validate with `zValidator("json" | "query" | "param", zodSchema)`. Zod v4: `z.email()`, `z.url()`, `z.string().trim()`.
- Chain middleware positionally: `.get("/", requireSession, requireAdmin, handler)`.
- Read input with `c.req.valid("json")`. Never `c.req.json()` without validation.
- Return `c.json(...)` for expected failures. Do not throw them.
- Use `errorBody({ message, code?, issues? })` from `@api/lib/http`.
- No `any` or casts. `HTTPException.status` is already typed.

```ts
export class MeService {
  static readonly inject = { auth: AuthService };
  constructor({ auth }: { auth: MeAuth }) {
    this.auth = auth;
  }
  readonly auth: MeAuth;
}

function createMeRoutes({ me }: { me: MeService }) {
  return new Hono<AppEnv>()
    .get("/", requireSession, (c) => c.json(me.profile({ session: c.get("session") })))
    .patch("/", requireSession, zValidator("json", updateMeInput, (result, c) => {
      if (!result.success) {
        return c.json(errorBody({
          message: "Invalid request body",
          code: "VALIDATION_ERROR",
          issues: result.error.issues,
        }), 400);
      }
    }), async (c) => {
      const { name } = c.req.valid("json");
      const updated = await me.updateName({ name, headers: c.req.raw.headers });
      if (!updated.ok) return c.json(errorBody({ message: "Failed to reload session", code: "INTERNAL_ERROR" }), 500);
      return c.json({ user: updated.user });
    });
}
```

`app.onError` maps thrown values to `{ error: { message, code } }`.

## Auth

```ts
export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json(errorBody({ message: "Unauthorized", code: "UNAUTHORIZED" }), 401);
  c.set("session", session);
  await next();
});
```

Web and API share the database and `BETTER_AUTH_SECRET`. The API `baseURL` is its own public origin; `trustedOrigins` includes the web origin. Better Auth is only at `/api/auth/*`. `tanstackStartCookies()` is web-only. Desktop is not wired: keep `@better-auth/electron` and `bearer` out until that work is in scope, then add them in `auth.ts` and register the desktop origin in `TRUSTED_ORIGINS`.

## Web client

`import type` only for `@api/*`. A value import pulls the API server into the browser bundle.

```ts
export const honoClient = hc<AppType>(clientEnv.VITE_HONO_API_URL, {
  init: { credentials: "include" },
});
```

`VITE_HONO_API_URL` defaults to `http://localhost:3100` (API origin). `credentials: "include"` is required for the session cookie.

Dev: API `:3100`, web `:3040`, same `localhost` host, CORS `credentials: true`. Prod: API on a subdomain of the same registrable domain, `advanced.crossSubDomainCookies: { enabled: true, domain: ".example.com" }`. Do not add a blanket `/api/*` proxy in `apps/web` while legacy TanStack `/api/*` routes still exist.

## Migration checklist

1. Move needed tables into `@repo/db` and update imports. Change schema through Drizzle commands. Do not hand-edit SQL migrations unless explicitly allowed. Do not edit `auth.schema`; it is generated by `auth:migrate`.
2. Add `apps/api/src/modules/<name>/` (`pnpm --dir apps/api generate resource <name>` or by hand) with a controller (zod, `requireSession` / `requireAdmin`) and a service that takes `DbService` / `AuthService`. Put tests in `modules/<name>/tests/`.
3. Mount it in `app.ts`: resolve the controller and `.route("/<name>", controller.routes)` (the generate CLI does this).
4. Replace web `createServerFn` / `src/routes/api/*` usage with `honoClient.api.<name>.*` and React Query.
5. Delete the legacy server file and its route handler.
