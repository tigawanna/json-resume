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

# Agent guide

Load a project skill before changing the matching code. Intent skills above cover library APIs. Repo skills cover how this codebase is put together:

- `tanstack-src-layout` — where files go under `apps/web/src/`
- `web-ui` — routes, React Query, forms, styling, client types
- `hono-api` — `apps/api` routes, auth, client, and legacy server migration
- `urgentry` — local error store (`pnpm --dir apps/web urgentry`)

## Stack

React 19 (compiler; no `useMemo` / `useCallback`), Tailwind CSS v4, TanStack Router / Query / Form, Hono RPC in `apps/api`, Better Auth, DaisyUI themes, shadcn/ui, Zod v4 (`z.email()`, `z.url()`), Sonner, Lucide. Urgentry is the local Sentry-compatible store via `VITE_SENTRY_DSN`; do not read `~/.urgentry` SQLite. Vite+: `vp dev` / `vp build` for web and libraries, `vp pack` for the Node API. A Workers deploy would use Wrangler.

## Always

- One named object parameter for functions and components. Positional args only to match a required third-party signature.
- One ternary for a yes/no choice. More than three outcomes, or any nested ternary, uses `if` / `else if` or `switch`.
- Group related files in a named folder. Do not keep adding loose files to `utils/`, `hooks/`, `lib/`, or `modules/`.
- Keep files under ~150 lines, with 200 as the hard ceiling. When a file outgrows that, split it by responsibility into a named folder (for example `route.ts`, `list.ts`, `schema.ts`, `helpers.ts`, `*.test.ts`) instead of growing one file or adding loose siblings.
- New backend code goes in `apps/api`. Do not add `createServerFn`, `src/routes/api/*`, or `*.server.ts` data access. Migrate a legacy piece when you touch it (`hono-api`).
- `import type` only for `@api/*`. No `any` and no casts that hide type errors. `catch` and `onError` use `unknown`.
- Schema changes go through Drizzle. Do not hand-edit SQL migrations unless explicitly allowed. Do not edit `auth.schema`; `auth:migrate` generates it.
- Invalidate React Query with `meta.invalidates`. Do not call `invalidateQueries` inside `onSuccess`.

## Drizzle reads

Push filtering, joining, and shaping into one SQL statement. Do not issue a query per row when a join can load the graph, and do not reshape rows in JavaScript when the select can return the shape.

- A simple relation (`with`, column omit, limit) uses `db.query`.
- Anything the relational API cannot express as one join — extra filters on the joined table, aggregates, custom nesting — uses `db.select` plus `innerJoin` / `leftJoin`. Spread `getTableColumns` (drop columns you do not want) and pass the related table, or a subset of its columns, as a nested field so the result stays typed: `{ ...eventColumns, user }`.
- Do not write the whole statement in `sql`. That drops the schema types. `sql` is only for a single selected field or a fragment inside `where` / `orderBy` when the query builder has no equivalent.
