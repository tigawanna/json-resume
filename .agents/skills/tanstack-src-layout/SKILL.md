---
name: tanstack-src-layout
description: >-
  Place files in the TanStack Start app at apps/web/src/. Use when adding,
  moving, or deciding where code goes for routes, components, data-access-layer,
  lib, modules, services, hooks, utils, types, config, data, workflows, styles,
  or middleware. Applies to TanStack Start and TanStack Router only, not Expo
  or Electron.
---

# TanStack Start source layout

This applies only to TanStack Start and TanStack Router web apps. This repo: `apps/web/src/`.

## Tree

```
src/
├── routes/                  # File-based routing (TanStack generates routeTree.gen.ts)
│   ├── <route>/
│   │   ├── index.tsx        # Route entry — exporting a component here becomes a route
│   │   ├── -components/     # Route-only UI (ignored by the router)
│   │   ├── -utils/          # Route-only helpers
│   │   └── -hooks/          # Route-only hooks (UI/state, not query wrappers)
│   └── -components/         # Shared across multiple routes in this app (e.g. landing)
├── components/              # Global, reusable UI
│   ├── ui/                  # shadcn codegen ONLY — do not add custom files here
│   └── <concern>/           # Named by concern — keep folders focused
├── data-access-layer/       # queryOptions, collections, typed clients
├── lib/                     # Wrappers around installed packages
├── modules/                 # App business logic, server functions, domain rules
├── services/                # External HTTP/API clients, one domain per folder
├── hooks/                   # Global UI/behavior hooks — not query wrappers
├── utils/                   # Standalone helpers copyable into other projects
├── types/                   # Types with no inference path
├── config/                  # Static app configuration
├── data/                    # Static fixtures / seed data
├── workflows/               # Long-running workflow definitions
├── styles/                  # Global or feature CSS entry files
├── middleware/              # TanStack Start middleware
├── router.tsx
└── routeTree.gen.ts         # Generated — do not edit
```

## Where new code goes

```
Route URL or route loader?        → routes/
UI used on one route?             → routes/<route>/-components/ (or -utils / -hooks)
UI reused across routes?          → routes/-components/ or components/<concern>/
shadcn primitives?                → components/ui/ (codegen only)
queryOptions, collection, client? → data-access-layer/<domain>/
Coupled to an npm package?        → lib/<package>/
App business logic / server fns?  → modules/<domain>/
Raw external API client?          → services/<domain>/
Generic string/date/url helper?   → utils/
Global type with no inference?    → types/ (sparingly)
```

## `routes/`

TanStack Router turns any `*.tsx` route file that exports a route definition into a URL. Prefix a folder with `-` to opt out of routing.

| Prefix         | Use for                                                                            |
| -------------- | ---------------------------------------------------------------------------------- |
| `-components/` | UI only used on this route or route group.                                         |
| `-utils/`      | Helpers only needed on this route.                                                 |
| `-hooks/`      | Local UI/state for this route. Data fetching uses `queryOptions` in the component. |

Hoist when reuse grows: one route stays in `routes/<route>/-components/`; several routes move to `routes/-components/` or `components/<name>/`; app-wide UI goes to `components/<name>/`.

Route files stay thin: `beforeLoad`, loader concerns, and composition. Heavy UI lives in `-components/`.

## `components/`

`ui/` is shadcn codegen only. Everything else is a named folder for one concern (`navigation/`, `search/`). Split a folder when it becomes a junk drawer. Presentation only: no fetchers, no business rules, no `queryOptions`.

## `data-access-layer/`

How data is loaded.

Put here: `queryOptions` / `mutationOptions`, TanStack DB collections, shared query key prefixes (`query-keys.ts`), typed API clients imported by domain files.

Do not put here: `usePosts`-style hooks, UI, unrelated business logic. Call `useQuery(postsQueryOptions)` in the component.

Keep the chain flat. A fetch used once and trivial is inlined in `queryFn`. A fetch reused by several query options, collections, or server functions stays in the same file, above the `queryOptions` export. Do not split `posts-fetcher.ts` → `posts-query-options.ts` → `use-posts.ts` → component unless there is real reuse.

Exception: `data-access-layer/auth/viewer.ts` may colocate middleware and viewer query options.

Server functions that mutate data usually live in `modules/` and are called from `queryFn` / `mutationFn` here.

```typescript
async function fetchPosts() {
  return postsClient.list();
}

export const postsQueryOptions = queryOptions({
  queryKey: ["posts"],
  queryFn: fetchPosts,
});
```

```typescript
const { data } = useSuspenseQuery(postsQueryOptions);
```

## `lib/`

Portable wrappers around installed dependencies. The test: the folder works in another project's `lib/` once that dependency is installed.

| Subfolder   | Coupled to                             |
| ----------- | -------------------------------------- |
| `tanstack/` | TanStack Form, Query, Router, Devtools |
| `db/`       | Drizzle / database package             |
| `envs/`     | Environment parsing                    |
| `markdown/` | Shiki, markdown pipeline               |
| `telegram/` | Telegram Bot API client wrapper        |
| `utils.ts`  | shadcn `cn()`                          |

Domain business logic belongs in `modules/`.

## `modules/`

App-specific business logic that is not a dependency wrapper and is not route-local. Examples: `admin-auth/`, `backstage/`, `journal/`, `github/`. Often holds `createServerFn` handlers, domain schemas, and mappers. Imported by `data-access-layer/` and sometimes by routes or workflows.

## `services/`

Thin external HTTP clients, one domain per folder. Typed request and response functions only. No React, no query keys.

## `hooks/`

Global UI behavior and local state: debounce, scroll, media queries, hotkeys. Do not add hooks that only wrap `useQuery` or `useMutation`. Route-specific hooks go in `routes/<route>/-hooks/`. Auth/viewer hooks may live in `data-access-layer/auth/` when they are session infrastructure.

## The rest

- `utils/`: dependency-light helpers (`slugify`, `errors`, `date-helpers`). Not domain rules.
- `types/`: only types that cannot be inferred. Prefer `ReturnType` and inference from query options or server functions. Do not define a type and cast an API response to it.
- `config/`: static metadata, feature flags, link constants. No fetching.
- `data/`: compile-time fixtures. Not a substitute for `data-access-layer/`.
- `workflows/`: multi-step async workflows. Steps may call `modules/` and `lib/envs/`.
- `styles/`: CSS entry files imported from routes or root. Component Tailwind stays in components.
