<!-- intent-skills:start -->

## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:

- Run `pnpm exec intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm exec intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

# Frontend Client Instructions

## Tech Stack (Important Notes for AI)

- **React 19** with React Compiler - DO NOT use `useMemo` or `useCallback` (compiler handles optimizations)
- **Tailwind CSS v4** - Latest syntax and features
- **TanStack Router** (file-based routing)
- **TanStack Query** (React Query)
- **TanStack Form** (If a form primitive doesnt exost make one)
- **Hono + Hono RPC** (end-to-end type-safe API; backend lives in `apps/api`)
- **Better Auth**
- **DaisyUI** (powers themes)
- **shadcn/ui components**
- **Zod v4** (don't do z.string().email() do z.email()/z.url()), **Sonner**, **Lucide React**
- **Urgentry** is the local Sentry-compatible error store. The app reports through `VITE_SENTRY_DSN`. Query it with `pnpm --dir apps/web urgentry <status|issues|prove>` (`apps/web/scripts/urgentry.ts`). Do not read `~/.urgentry` SQLite directly. See the `urgentry` skill for the API.

## Function arguments

Prefer one object parameter over positional arguments for functions and React components, including single-field objects. Name the fields. Keep positional parameters only when matching a required third-party signature.

## Branching

A single ternary is fine for a yes/no choice. For more than three outcomes, or any nested ternary, use `if` / `else if` or `switch`.

```ts
let providers: string[];
if (routing.mode === "official" && endpoints) {
  providers = availableOfficialSlugs(modelId, endpoints);
} else if (routing.mode === "official") {
  providers = [...officialProviderSlugs(modelId)];
} else if (routing.mode === "custom") {
  providers = routing.providers;
} else {
  providers = [];
}
```

## Source layout

`apps/web/src/` is a TanStack Start app. Routes live in `routes/<route>/index.tsx`. Route-only UI, helpers, and hooks use a `-` prefix so the router ignores them. Shared UI is `components/` (`ui/` is shadcn codegen only). Data loading is `data-access-layer/`. Package wrappers are `lib/`. App rules and server functions are `modules/`. External HTTP clients are `services/`. Load the `tanstack-src-layout` skill before adding or moving files under `apps/web/src/`.

Backend logic (new code) lives in `apps/api/` (Hono + Hono RPC). `apps/web/src/modules/*` and `src/routes/api/*` are the legacy home; migrate a piece when you touch it instead of adding to it. See `Backend: Hono RPC (apps/api)` below.

## Group files in folders

Folders are the grouping mechanism. Do not keep adding loose files to helper directories (`utils/`, `-utils/`, `hooks/`, `lib/`) or to `modules/` until unrelated files sit side by side, especially when their names share no prefix. Put related logic in a named folder for that concern so the files that belong together stay together.

---

## TanStack Start: import protection and server functions

TanStack Start's import protection (Vite, on by default) keeps client and server bundles apart: the client denies `**/*.server.*` and `@tanstack/react-start/server`, the server denies `**/*.client.*`, you can mark odd paths with `server-only` / `client-only` imports (never both in one file), resolved `node_modules` paths skip file-pattern checks unless you change `excludeFiles`, and dev defaults to `mock` while production build defaults to `error`, all tunable via `tanstackStart({ importProtection })`. The compiler can drop server-only imports that exist only inside `createServerFn().handler(...)`, but any use outside that boundary keeps the import in the client graph, so split modules or use `createServerOnlyFn` / `createIsomorphicFn` instead of leaky helpers; post-tree-shaking build checks are definitive, while dev warnings (e.g. barrels re-exporting `.server` files) may be false positives. Define RPC with `createServerFn().inputValidator(...).handler(async ({ data }) => ...)` from `@tanstack/react-start`, validate `data`, let handlers throw or call `redirect()` / `notFound()`, export callables from `*.functions.ts`, keep DB and other server helpers in `*.server.ts` only pulled into handlers, share plain `*.ts` for types/schemas, and prefer static imports over dynamic `import()` for server function modules. Request/response utilities such as `getRequest` and `setResponseHeaders` come from `@tanstack/react-start/server` and must run only in server contexts.

---

## Backend: Hono RPC (`apps/api`)

All backend logic lives in `apps/api/` (Hono on Node, Better Auth, Drizzle/libsql). The web app is UI only and talks to it through a typed `hc<AppType>` client. **Do not add new `createServerFn` handlers, `src/routes/api/*` route files, or `*.server.ts` data-access code.** When a task touches legacy server code, migrate that piece into `apps/api` (see the checklist at the end of this section) instead of extending it.

**Reference implementation (when in doubt):** `/home/dennis/Desktop/code/fullstack/tangerine` — a working monorepo with the exact same Hono + Better Auth + Drizzle + evlog setup, including web + desktop (Electron/Deno) auth. Mirror its `apps/api` (Hono app, auth, routes, evlog), `packages/auth` (shared GitHub/auth pieces), and `docs/auth.md` / `docs/vercel-deploy.md`. Prefer copying patterns from there over inventing new ones.

### Package layout

```
apps/api/
  package.json
  tsconfig.json
  src/
    app.ts          # one chained Hono expression -> `AppType`
    index.ts        # node serve entry (Vercel uses `app.fetch`)
    env.ts          # zod-validated env (DATABASE_URL, BETTER_AUTH_*, GITHUB_*, …)
    db/client.ts    # drizzle client (shared schema from @repo/db)
    auth/
      auth.ts       # Better Auth instance (no tanstackStartCookies)
      middleware.ts # requireSession / requireAdmin Hono middleware
    routes/
      <resource>/route.ts   # one Hono instance per resource
    lib/            # http error helpers, etc.
```

### Composition rule (chained routes)

`AppType = typeof app` is the whole type-safety story. Build it in one chained expression so the client sees every route:

```ts
// apps/api/src/app.ts
export const app = new Hono<EvlogVariables>()
  .basePath("/api")
  .use("*", evlog({ ... }))
  .use("*", cors({ origin, credentials: true }))
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/health", healthRoute)
  .route("/viewer", viewerRoute)
  .route("/me", meRoute)
  .onError((err, c) => errorResponse({ c, err, isProduction }));
```

- `basePath("/api")` is part of the type, so the client calls `honoClient.api.health.$get()`.
- Mount a resource with `.route("/<name>", <name>Route)`, never `app.use()` with a nested handler — the latter hides types.
- Keep each resource in its own file exporting `const <name>Route = new Hono<AppEnv>().get(...).post(...)`.

### Route file pattern

```ts
// apps/api/src/routes/me/route.ts
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { auth } from "@api/auth/auth";
import { requireSession } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";

export const updateMeInput = z.object({
  name: z.string().trim().min(1).max(120),
});

export const meRoute = new Hono<AppEnv>()
  .get("/", requireSession, (c) => c.json({ user: c.get("session").user }))
  .patch(
    "/",
    requireSession,
    zValidator("json", updateMeInput, (result, c) => {
      if (!result.success) {
        return c.json(
          errorBody({
            message: "Invalid request body",
            code: "VALIDATION_ERROR",
            issues: result.error.issues,
          }),
          400,
        );
      }
    }),
    async (c) => {
      const { name } = c.req.valid("json");
      await auth.api.updateUser({ body: { name }, headers: c.req.raw.headers });
      const updated = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!updated)
        return c.json(errorBody({ message: "Unauthorized", code: "UNAUTHORIZED" }), 401);
      return c.json({ user: updated.user });
    },
  );
```

Rules:

- ✅ Validate input with `zValidator("json" | "query" | "param", zodSchema)`. Zod v4: `z.email()`, `z.url()`, `z.string().trim()`.
- ✅ Chain middleware positionally: `.get("/", requireSession, requireAdmin, handler)`. Middleware runs left-to-right.
- ✅ Read the body/params/query via `c.req.valid("json")` — never `c.req.json()` without validation.
- ✅ Return plain `c.json(...)`. Do not throw for expected failures; return the right status.
- ✅ Use `errorBody({ message, code?, issues? })` from `@api/lib/http` so the client unwraps one shape.
- ❌ No `any` / casts. `HTTPException.status` is already typed; pass it straight through.

### Auth middleware

```ts
// apps/api/src/auth/middleware.ts
export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json(errorBody({ message: "Unauthorized", code: "UNAUTHORIZED" }), 401);
  c.set("session", session);
  await next();
});
```

- Web + API share the same database and `BETTER_AUTH_SECRET`. The API's `baseURL` is its own public origin; `trustedOrigins` contains the web origin.
- Better Auth is mounted at `/api/auth/*` via `.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))`. Do not add a separate TanStack auth route.
- `tanstackStartCookies()` is web-only; the API never uses it.
- Desktop support is **not wired yet**. When it is, add the `@better-auth/electron` + `bearer` plugins to `apps/api/src/auth/auth.ts` and register the desktop origin in `TRUSTED_ORIGINS`. Until then, keep them out of the API.

### Error handling

`app.onError` converts every thrown value to `{ error: { message, code } }`. Expected failures are returned, not thrown. The web client uses the `ApiErrorBody` shape.

### Web client

```ts
// apps/web/src/lib/api/client.ts
import type { AppType } from "@api/app";
import { hc } from "hono/client";
import { clientEnv } from "@/lib/env/client-env";

export const honoClient = hc<AppType>(clientEnv.VITE_HONO_API_URL, {
  init: { credentials: "include" },
});
```

- `import type` only — never a value import of `@api/*`, or the API server lands in the browser bundle.
- `VITE_HONO_API_URL` defaults to `http://localhost:3100` and is the API origin (not the web origin).

React Query usage (same rules as before, but against the typed client):

```ts
export const viewerQueryOptions = queryOptions({
  queryKey: ["viewer"],
  queryFn: async () => {
    const res = await honoClient.api.viewer.$get();
    if (!res.ok) throw new Error((await res.json()).error.message);
    return res.json();
  },
});

const mutation = useMutation({
  mutationFn: async (data: { name: string }) => {
    const res = await honoClient.api.me.$patch({ json: data });
    if (!res.ok) throw new Error((await res.json()).error.message);
    return res.json();
  },
  meta: { invalidates: [["viewer"]] },
});
```

- Hono routes are inferred from the chained expression; `$get()`, `$post()`, `$patch()`, and `{ json, query, param }` inputs are fully typed.
- `credentials: "include"` is required so the Better Auth session cookie reaches the API.

### Cookies / origins in dev and prod

- Dev: API on `:3100`, web on `:3040`. Same host (`localhost`) so the session cookie is shared; CORS is configured with `credentials: true`.
- Prod: put the API on a subdomain (`api.example.com`) of the same registrable domain as the web app, enable `advanced.crossSubDomainCookies: { enabled: true, domain: ".example.com" }`, and set `VITE_HONO_API_URL` to the API origin.
- Do **not** add a blanket `/api/*` proxy in `apps/web` while legacy `/api/*` TanStack routes still exist; that would shadow them. A same-origin proxy is the end state once all routes have migrated.

### Desktop auth (future — keep the door open)

Desktop (Electron / Tauri / Deno) is **not wired yet**, but the API is already shaped so it can be added without rework. Follow the tangerine example (`apps/electron`, `apps/desktop`, `packages/auth`, `docs/auth.md`):

- Add `@better-auth/electron` (or the platform's deep-link plugin) and `bearer()` to the plugin list in `apps/api/src/auth/auth.ts`. The bearer plugin lets desktop clients send `Authorization: Bearer <token>` instead of cookies.
- Register the desktop origin in `TRUSTED_ORIGINS` (tangerine uses `ELECTRON_TRUSTED_ORIGIN` / `com.tigawanna.tangerine:/`). Merge it into `AUTHORIZED_ORIGINS` in `env.ts` rather than hard-coding.
- Keep `BETTER_AUTH_URL` as the public origin the desktop flow redirects back to; the OAuth callback stays `{BETTER_AUTH_URL}/api/auth/callback/github`.
- Desktop clients do **not** use cookies; they exchange a PKCE code via the loopback/deep-link and store the resulting bearer token locally. The web client keeps using cookies via `credentials: "include"`.
- Keep `advanced.crossSubDomainCookies` optional and gated on a real parent domain; desktop never needs it.
- Do not branch the auth instance per platform — one `auth` instance with all plugins is fine; plugins are additive.

Until desktop is in scope, leave these plugins out (they change the session/cookie behavior and add surface area).

### Migration checklist (legacy → `apps/api`)

When you touch a piece of legacy server code, move it instead of extending it:

1. Move the DB tables it needs into `@repo/db` (start with the auth tables already shared) and update imports.
2. Add a resource under `apps/api/src/routes/<name>/route.ts` with zod validation and `requireSession`/`requireAdmin`.
3. Mount it in `apps/api/src/app.ts` with `.route("/<name>", <name>Route)`.
4. Replace the `createServerFn`/`src/routes/api/*` usage in `apps/web` with `honoClient.api.<name>.*` + React Query.
5. Delete the legacy server file and its route handler.

### Common API mistakes to avoid

1. Value-importing `@api/*` in the browser (use `import type`).
2. Building `app` from multiple `new Hono()` instances glued together with `app.route()` inside a function — the chained expression is what carries `AppType`.
3. Reading `c.req.json()` without `zValidator`.
4. Forgetting `credentials: "include"` on `hc` (session cookie never arrives).
5. Mounting Better Auth anywhere except `/api/auth/*` on the API.
6. Adding desktop/electron plugins before desktop support is in scope.

---

### Routing

- ✅ Create routes in folders with `index.tsx` file
- ✅ Put route-specific components in `-components` folder
  ```
  routes/
    dashboard/
      index.tsx
      -components/
        DashboardCard.tsx
  ```
- ✅ Put reusable/global components in `src/components/`
- ✅ Use `beforeLoad` for auth and role checks
- ✅ Throw `redirect()` for unauthorized access

### React Query

- ✅ Create `queryOptions` and use hooks directly in components

  ```typescript
  export const usersQueryOptions = queryOptions({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await honoClient.api.users.$get();
      if (!res.ok) throw new Error((await res.json()).error.message);
      return res.json();
    },
  });

  // In component
  const query = useSuspenseQuery(usersQueryOptions);
  ```

- ✅ Use `useSuspenseQuery` for required data
- ✅ Handle mutations inline in components
- ✅ Exception: Auth/viewer logic can have custom hooks

### Styling

- ✅ Use shadcn components for UI elements
- ✅ Use DaisyUI for:
  - Theme utilities: `bg-base-100`, `bg-base-200`, `text-base-content`
  - Button classes: `btn`, `btn-primary`, `btn-ghost`, `btn-sm`
  - Card classes: `card`, `card-body`
  - Other theme-related utilities
- ✅ Use `twMerge` for className merging
- ✅ Add `data-test` attributes for testability

### Forms

- ✅ Use TanStack Form with custom field components
- ✅ Validate with Zod inline
  ```typescript
  <form.AppField
    name="email"
    validators={{ onChange: z.string().email() }}>
    {(field) => <field.TextField label="Email" />}
  </form.AppField>
  ```

### Code Organization

- ✅ Use path alias `@/` for imports
- ✅ Import types from `@backend/` for end-to-end type safety
- ✅ Keep route logic in route files
- ✅ Extract reusable logic to custom hooks
- ✅ Use `satisfies` operator for type checking

---

## ❌ DON'T

### React 19 with Compiler

- ❌ DON'T use `useMemo` - React Compiler handles it
- ❌ DON'T use `useCallback` - React Compiler handles it
- ❌ DON'T manually optimize unless profiling shows issues

### React Query

- ❌ DON'T create custom hooks for every query
- ❌ DON'T wrap `queryOptions` in custom hooks (except auth/viewer)
- ❌ DON'T over-abstract data fetching

### Routing

- ❌ DON'T put components directly in route file if they're reusable
- ❌ DON'T create route files without folder structure
- ❌ DON'T skip `beforeLoad` for protected routes
- ❌ DON'T create flat route structure - use folders with index files

### Styling

- ❌ DON'T mix DaisyUI components with shadcn (stick to shadcn for UI)
- ❌ DON'T use DaisyUI except for theme utilities and button classes or simple component taht can no seroius accessibility require,nets an dis standalone enough
- ❌ DON'T forget responsive design (`md:`, `lg:` prefixes)
- ❌ DON'T hardcode colors - use theme variables

### File Organization

- ❌ DON'T put route-specific components in global `components/` folder
- ❌ DON'T create components in route file itself - use `-components` folder
- ❌ DON'T forget to use path aliases (`@/`)
- ❌ DON'T add new `createServerFn`, `src/routes/api/*` handlers, or `*.server.ts` data-access code — put backend logic in `apps/api`

---

## Quick Reference

### Route Structure

```typescript
// routes/dashboard/index.tsx
export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  beforeLoad: async (context) => {
    if (!context.context.viewer?.user) {
      throw redirect({ to: "/auth", search: { returnTo: context.location.pathname } });
    }
  },
});

function DashboardPage() {
  const query = useSuspenseQuery(dataQueryOptions);
  return <div>...</div>;
}
```

### Query Pattern

```typescript
// Define queryOptions
export const itemsQueryOptions = queryOptions({
  queryKey: ["items"],
  queryFn: async () => {
    const res = await honoClient.api.items.$get();
    if (!res.ok) throw new Error((await res.json()).error.message);
    return res.json();
  },
});

// Use directly in component
const { data } = useSuspenseQuery(itemsQueryOptions);
```

### Mutation Pattern

```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    const res = await honoClient.api.items.$post({ json: data });
    if (!res.ok) throw new Error((await res.json()).error.message);
    return res.json();
  },
  onSuccess() {
    toast.success("Success!");
  },
  meta: {
    invalidates: [["items"]],
  },
});
```

### Form Pattern

```typescript
const form = useAppForm({
  ...formOptions({ defaultValues: { name: "" } }),
  onSubmit: async ({ value }) => mutation.mutate(value),
});
```

### Styling Classes

```tsx
// DaisyUI theme utilities
<div className="bg-base-100 text-base-content">
  <button className="btn btn-primary">Action</button>
</div>

// shadcn components for everything else
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
</Card>
```

---

## Common Mistakes to Avoid

1. Creating custom hooks for every React Query call
2. Using `useMemo`/`useCallback` with React 19 Compiler
3. Putting route components in wrong folders
4. Mixing DaisyUI components with shadcn (use shadcn for UI, DaisyUI for theme and simpler components that won't be nested in daisyui ones)
5. Forgetting `data-test` attributes
6. Not using `beforeLoad` for route protection
7. Creating routes without folder structure
8. Avoid casting to any or any types , request for permisson to do any such thig .Hiding type issues by casting t other pes is STRICTLY FORBIDDEN
9. Errors should be of type unknown in the catch block
10. Value-importing `@api/*` in the browser (use `import type`)
11. Reading `c.req.json()` without `zValidator`
12. Forgetting `credentials: "include"` on `hc`
    Do

```ts
    onSuccess() {
      toast.success("User removed");
      if (onSuccess) onSuccess(undefined);
    },
    onError(err: unknown) {
      toast.error("Failed to remove user", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [["users"]],
    },
```

DON'T

```ts
    onSuccess() {
      toast.success("User removed");
      if (onSuccess) {
        onSuccess(undefined);
        qc.invalidatesQuery({queryKey:["users]
        })
        }
    },
    onError(err: any) {
      toast.error("Failed to create organization", { description: String(err?.message ?? err) });
    },
```

DO NOT manually bypass drizzle and edit the sql migratins files unless when explicitly allowed to do it go through the drizzle schema and commnads everytime

DO NOT manually edit the auth.schema it should be auto genrated by the auth:migrate command
