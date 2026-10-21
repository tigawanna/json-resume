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
- **Elysia Eden Treaty** (end-to-end type-safe API)
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

## Group files in folders

Folders are the grouping mechanism. Do not keep adding loose files to helper directories (`utils/`, `-utils/`, `hooks/`, `lib/`) or to `modules/` until unrelated files sit side by side, especially when their names share no prefix. Put related logic in a named folder for that concern so the files that belong together stay together.

---

## TanStack Start: import protection and server functions

TanStack Start's import protection (Vite, on by default) keeps client and server bundles apart: the client denies `**/*.server.*` and `@tanstack/react-start/server`, the server denies `**/*.client.*`, you can mark odd paths with `server-only` / `client-only` imports (never both in one file), resolved `node_modules` paths skip file-pattern checks unless you change `excludeFiles`, and dev defaults to `mock` while production build defaults to `error`, all tunable via `tanstackStart({ importProtection })`. The compiler can drop server-only imports that exist only inside `createServerFn().handler(...)`, but any use outside that boundary keeps the import in the client graph, so split modules or use `createServerOnlyFn` / `createIsomorphicFn` instead of leaky helpers; post-tree-shaking build checks are definitive, while dev warnings (e.g. barrels re-exporting `.server` files) may be false positives. Define RPC with `createServerFn().inputValidator(...).handler(async ({ data }) => ...)` from `@tanstack/react-start`, validate `data`, let handlers throw or call `redirect()` / `notFound()`, export callables from `*.functions.ts`, keep DB and other server helpers in `*.server.ts` only pulled into handlers, share plain `*.ts` for types/schemas, and prefer static imports over dynamic `import()` for server function modules. Request/response utilities such as `getRequest` and `setResponseHeaders` come from `@tanstack/react-start/server` and must run only in server contexts.

---

## ✅ DO

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
    queryFn: async () => treatyClient.users.get(),
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
    const { data, error } = await treatyClient.items.get();
    if (error) throw error;
    return data;
  },
});

// Use directly in component
const { data } = useSuspenseQuery(itemsQueryOptions);
```

### Mutation Pattern

```typescript
const mutation = useMutation({
  mutationFn: async (data) => treatyClient.items.post(data),
  onSuccess() {
    toast.success("Success!");
  },
  meta:{
    invalidates:[["items]]
  }
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
