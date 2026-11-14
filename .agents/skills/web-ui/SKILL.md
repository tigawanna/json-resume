---
name: web-ui
description: >-
  Implement apps/web UI with React 19, TanStack Router, TanStack Query, TanStack
  Form, shadcn, and DaisyUI. Use when adding or changing routes, queries,
  mutations, forms, styling, or client data loading. For where a file belongs,
  use the tanstack-src-layout skill.
---

# Web UI

React 19 with the React Compiler. Do not add `useMemo` or `useCallback`. Do not hand-optimize unless a profile shows a problem.

File placement is the `tanstack-src-layout` skill. This skill is how those files behave.

## Routing

Routes live in `routes/<route>/index.tsx`. Route-only UI goes in `-components/`. Shared UI goes in `src/components/`. `components/ui/` is shadcn codegen only.

Protect routes in `beforeLoad` and throw `redirect()` when the viewer is missing. Keep the route file thin.

```tsx
export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  beforeLoad: async (context) => {
    if (!context.context.viewer?.user) {
      throw redirect({ to: "/auth", search: { returnTo: context.location.pathname } });
    }
  },
});
```

## React Query

Define `queryOptions` and call `useSuspenseQuery` in the component. Mutations stay inline. Auth and viewer are the only queries that get custom hooks. Invalidate with `meta.invalidates`, not a manual `invalidateQueries` inside `onSuccess`.

```ts
export const itemsQueryOptions = queryOptions({
  queryKey: ["items"],
  queryFn: async () => {
    const res = await honoClient.api.items.$get();
    if (!res.ok) throw new Error((await res.json()).error.message);
    return res.json();
  },
});

const mutation = useMutation({
  mutationFn: async (data: { name: string }) => {
    const res = await honoClient.api.items.$post({ json: data });
    if (!res.ok) throw new Error((await res.json()).error.message);
    return res.json();
  },
  onSuccess() {
    toast.success("Saved");
  },
  onError(err: unknown) {
    toast.error("Failed to save", { description: unwrapUnknownError(err).message });
  },
  meta: { invalidates: [["items"]] },
});
```

`catch` bindings and mutation `onError` take `unknown`. Do not use `any`.

## Forms

TanStack Form with field components. Validate with Zod v4 (`z.email()`, `z.url()`).

```tsx
const form = useAppForm({
  ...formOptions({ defaultValues: { name: "" } }),
  onSubmit: async ({ value }) => mutation.mutate(value),
});
```

## Styling

shadcn for UI. DaisyUI for theme utilities (`bg-base-100`, `text-base-content`), button classes (`btn`, `btn-primary`), and simple standalone pieces. Do not nest DaisyUI components inside each other when they need real accessibility, and do not mix DaisyUI component markup with shadcn for the same control. Merge classes with `twMerge`. Use theme variables and responsive prefixes (`md:`, `lg:`). Add `data-test` on interactive elements.

## Imports and types

Use `@/` for app imports. `import type` only for `@api/*`. Prefer `satisfies` over casts. Do not cast to `any` or hide a type error with a cast; ask before doing either.

Prefer one named object parameter for functions and components, including single-field objects. Keep positional parameters only when a third-party signature requires them.

A single ternary is fine. For more than three outcomes, or any nested ternary, use `if` / `else if` or `switch`.

## Legacy server code

Do not add `createServerFn`, `src/routes/api/*`, or `*.server.ts` data access. Load the `hono-api` skill and migrate the piece you touch. TanStack Start import protection still applies to leftover server functions: `*.server.*` stays off the client, helpers used outside `createServerFn().handler` belong in `createServerOnlyFn` / `createIsomorphicFn`, and `getRequest` / `setResponseHeaders` run only on the server.
