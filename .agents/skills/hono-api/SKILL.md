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
  app.ts            # one chained Hono expression -> AppType
  index.ts          # node serve entry (Vercel uses app.fetch)
  env.ts            # zod-validated env
  db/client.ts      # drizzle client (schema from @repo/db)
  auth/auth.ts      # Better Auth (no tanstackStartCookies)
  auth/middleware.ts
  routes/<resource>/route.ts
  lib/              # http error helpers
```

`AppType = typeof app` comes from one chained expression. Mount resources with `.route("/<name>", <name>Route)`. Do not glue separate `new Hono()` apps together inside a function, and do not `app.use()` a nested handler — both hide route types. `basePath("/api")` is part of the type, so the client calls `honoClient.api.health.$get()`.

```ts
export const app = new Hono<EvlogVariables>()
  .basePath("/api")
  .use("*", evlog({ ... }))
  .use("*", cors({ origin, credentials: true }))
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/health", healthRoute)
  .route("/me", meRoute)
  .onError((err, c) => errorResponse({ c, err, isProduction }));
```

Each resource file exports `const <name>Route = new Hono<AppEnv>().get(...).post(...)`.

## File size

Keep every file under `apps/api` at 150 lines or fewer. A file that would pass that limit is a signal to split it before finishing the change. Breaking a large file into smaller ones is the expected shape, not a later cleanup.

- One route module owns one resource. When `routes/<resource>/route.ts` grows, move handlers into sibling files (`list.ts`, `update.ts`) and re-export a short chained route.
- Put zod schemas next to the handler that uses them, or in `routes/<resource>/schema.ts` when more than one handler shares them.
- Shared HTTP helpers stay in `lib/` as small named modules. Do not grow a single helpers file past the limit.
- `app.ts` stays the mount list. New behavior goes in the resource folder, not into `app.ts`.

## Route rules

- Validate with `zValidator("json" | "query" | "param", zodSchema)`. Zod v4: `z.email()`, `z.url()`, `z.string().trim()`.
- Chain middleware positionally: `.get("/", requireSession, requireAdmin, handler)`.
- Read input with `c.req.valid("json")`. Never `c.req.json()` without validation.
- Return `c.json(...)` for expected failures. Do not throw them.
- Use `errorBody({ message, code?, issues? })` from `@api/lib/http`.
- No `any` or casts. `HTTPException.status` is already typed.

```ts
export const updateMeInput = z.object({
  name: z.string().trim().min(1).max(120),
});

export const meRoute = new Hono<AppEnv>()
  .get("/", requireSession, (c) => c.json({ user: c.get("session").user }))
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
    await auth.api.updateUser({ body: { name }, headers: c.req.raw.headers });
    const updated = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!updated) return c.json(errorBody({ message: "Unauthorized", code: "UNAUTHORIZED" }), 401);
    return c.json({ user: updated.user });
  });
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
2. Add `apps/api/src/routes/<name>/route.ts` with zod and `requireSession` / `requireAdmin`.
3. Mount it in `app.ts` with `.route("/<name>", <name>Route)`.
4. Replace web `createServerFn` / `src/routes/api/*` usage with `honoClient.api.<name>.*` and React Query.
5. Delete the legacy server file and its route handler.
