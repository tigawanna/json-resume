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
