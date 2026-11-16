# Paginated List Pattern

How to build searchable, paginated dashboard lists using the shared utilities — modeled on `AdminWaitlistList`.

Apply this when adding or cleaning up any admin/dashboard index list (waitlist, releases history, sync events, etc.). Same fundamentals whether data comes from React Query or TanStack DB.

---

## Shared utilities

| Utility                       | Path                                          | Role                                                                            |
| ----------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `usePageSearchQuery(routeID)` | `components/search/use-page-search-query.ts`  | Local input + debounced URL `q`; resets `page` on commit; exposes `clearSearch` |
| `SearchBox`                   | `components/search/SearchBox.tsx`             | Controlled search input; shows spinner while `isDebouncing`                     |
| `TSRListPagination`           | `components/pagination/TSRListPagination.tsx` | Reads `page` from the route search, navigates while preserving other params     |
| `ADMIN_LIST_PER_PAGE`         | `components/pagination/constants.ts`          | Default page size for server-paginated admin lists                              |

Always pass the **file route id** (e.g. `"/_dashboard/admin/waitlist/"`), not the path (`"/admin/waitlist"`).

```tsx
const { inputValue, onSearchChange, isDebouncing, clearSearch } = usePageSearchQuery(
  "/_dashboard/admin/waitlist/",
);

<SearchBox
  keyword={inputValue}
  setKeyword={(value) => onSearchChange(value)}
  isDebouncing={isDebouncing}
/>

<TSRListPagination routeID="/_dashboard/admin/waitlist/" totalPages={totalPages} />
```

### Search param contract

- URL param is always **`q`** (not `sq` / `search`).
- Route `validateSearch` must include `q: z.string().optional()` and `page: z.coerce.number().int().min(1).optional()`.
- Debounced commit clears `page` so results start at page 1.
- Default debounce is **400ms**.
- `clearSearch()` clears `q` + `page` immediately (no debounce) — use it on search-empty CTAs.
- Filter / sort patches use `Route.useNavigate()` (or a small local `patchSearch`) — not the search hook.

### Pagination contract

- `TSRListPagination` merges into existing search (sort, filters, `q`) and omits `page` when `page <= 1`.
- Returns `null` when `totalPages <= 1`.
- Do **not** hand-roll `useTransition` + `navigate` page setters beside it.

---

## Anatomy: list + scaffold

Split every list into two pieces:

1. **List** — data, early-return states, row rendering.
2. **Scaffold** — chrome that stays mounted across states: title, search, primary action / filters dialog, children slot, pagination.

```
┌─────────────────────────────────────────┐
│ Scaffold                                │
│  title + description                     │
│  [SearchBox]  [FiltersDialog?] [CTA?]   │
│  ┌───────────────────────────────────┐  │
│  │ children (pending / empty / list) │  │
│  └───────────────────────────────────┘  │
│  TSRListPagination                      │
└─────────────────────────────────────────┘
```

### Why wrap every branch in the scaffold

Pending, empty, search-empty, and loaded rows all share the same header/search/pagination. Nesting each early return inside the scaffold avoids duplicating chrome and keeps dialogs (create, filters, bulk import) mounted so their open state is not torn down on refetch.

```tsx
function ThingList() {
  const search = Route.useSearch();
  const q = search.q ?? "";
  // fetch…

  if (isPending) {
    return (
      <ThingListScaffold>
        <ThingPending />
      </ThingListScaffold>
    );
  }

  if (items.length === 0) {
    return (
      <ThingListScaffold totalPages={0}>
        {hasSearch ? <ThingSearchEmpty query={q.trim()} /> : <ThingEmpty />}
      </ThingListScaffold>
    );
  }

  return (
    <ThingListScaffold totalPages={pagination.totalPages}>
      <ul>{items.map(/* … */)}</ul>
    </ThingListScaffold>
  );
}
```

### Scaffold owns search + dialogs

```tsx
function ThingListScaffold({ children, totalPages = 0 }) {
  const { inputValue, onSearchChange, isDebouncing } = usePageSearchQuery(ROUTE_ID);

  return (
    <div className="flex min-h-full w-full flex-col gap-6">
      {/* title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchBox
            keyword={inputValue}
            setKeyword={(value) => onSearchChange(value)}
            isDebouncing={isDebouncing}
          />
        </div>
        {/* Filters dialog and/or create/import dialogs live here */}
      </div>
      {children}
      <TSRListPagination routeID={ROUTE_ID} totalPages={totalPages} />
    </div>
  );
}
```

Row-level edit/delete dialogs stay on the row component (nested dialogs are fine). List-level actions (create, bulk import, filters) belong in the scaffold.

---

## Early returns over nested ternaries

Prefer:

```tsx
if (isPending)
  return (
    <Scaffold>
      <Pending />
    </Scaffold>
  );
if (items.length === 0) {
  return <Scaffold>{hasSearch ? <SearchEmpty /> : <Empty />}</Scaffold>;
}
return (
  <Scaffold>
    <List />
  </Scaffold>
);
```

Avoid:

```tsx
{
  isPending ? <Pending /> : items.length === 0 ? hasSearch ? <SearchEmpty /> : <Empty /> : <List />;
}
```

Extract tiny presentational empties (`ThingSearchEmpty`, `ThingEmpty`) instead of inlining long JSX in conditionals.

---

## Data sources

### React Query (server-paginated)

```tsx
const { data, isPending } = useQuery(thingsQueryOptions({ page, perPage: ADMIN_LIST_PER_PAGE, q }));
const items = data?.items ?? [];
const totalPages = data?.pagination.totalPages ?? 0;
```

- Prefer `useQuery` + pending early return when the list can show a pending shell inside the scaffold.
- `useSuspenseQuery` is fine when the route already has a `pendingComponent` and you only need empty vs loaded.

### TanStack DB (live query)

Drive search and paging in the query builder so results stay incrementally maintained:

```tsx
const q = search.q ?? ""; // committed URL value — feed the live query
const keyword = q.trim();
const offset = (page - 1) * ADMIN_LIST_PER_PAGE;

const { data: items } = useLiveQuery(
  (query) => {
    const base = query.from({ row: collection });
    const filtered = keyword
      ? base.where(({ row }) =>
          or(ilike(row.name, `%${keyword}%`), ilike(row.searchableText, `%${keyword}%`)),
        )
      : base;
    return filtered
      .orderBy(({ row }) => row.updatedAt, "desc")
      .limit(ADMIN_LIST_PER_PAGE)
      .offset(offset);
  },
  [keyword, offset],
);

const { data: totals } = useLiveQuery(
  (query) => {
    const base = query.from({ row: collection });
    const filtered = keyword
      ? base.where(({ row }) =>
          or(ilike(row.name, `%${keyword}%`), ilike(row.searchableText, `%${keyword}%`)),
        )
      : base;
    return filtered.select(({ row }) => ({ total: count(row.id) }));
  },
  [keyword],
);
```

- Drive the live query from the **committed** URL `q` (`search.q`), not the local input value. Local typing is for the `SearchBox` only; debounce happens in `usePageSearchQuery`.
- Do **not** `Array.filter` / `Array.slice` the live-query result — that throws away IVM.
- Empty state: matching `count` is `0` (not just the current page slice).
- Keep filters + sort controls in the scaffold; patch non-`q` params with `navigate({ search: (prev) => ({ …prev, … }) })` or a small helper.

---

## Reducing useEffect noise

| Smell                                         | Prefer                                            |
| --------------------------------------------- | ------------------------------------------------- |
| Syncing input ↔ URL by hand                   | `usePageSearchQuery`                              |
| Page `navigate` + `useTransition`             | `TSRListPagination`                               |
| Multiple effects for the same async lifecycle | One effect, or fold into the existing domain hook |
| Effects that only derive render flags         | Compute during render / early returns             |

---

## Route checklist

1. `validateSearch`: `page`, `q`, plus any sort/filter enums.
2. `beforeLoad`: admin gate (existing pattern on `/_dashboard/admin`).
3. Route file stays thin: export `Route`, render the list component (lazy + `ClientOnly` only when TanStack DB / browser APIs require it).
4. List lives under `features/<domain>/components/` or `routes/_dashboard/.../-components/<domain>/`.
5. `data-test` on the list root, search empty, and primary actions.
6. Empty UI uses the shared `Empty` primitives (`components/ui/empty`), not one-off cards, unless the surface is truly interactive.

---

## Reference implementation

Canonical source of truth:

- `apps/web/src/routes/_dashboard/admin/waitlist/-components/AdminWaitlistList.tsx`
- Route: `apps/web/src/routes/_dashboard/admin/waitlist/index.tsx`

Follow that shape for other admin lists.
