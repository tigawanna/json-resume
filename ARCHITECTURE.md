# Technical architecture (template)

## Overview

This monorepo is a **Vite+**-centric template: **pnpm** workspaces, **Turbo** for task orchestration, and **`apps/site`** as a **TanStack Start** application (file-based **TanStack Router**, SSR-capable React, **TanStack Query**).

Rename branding in `apps/site/src/utils/system.tsx` (`AppConfig`) and adjust routes to match your product.

---

## Repository layout

| Path | Role |
| --- | --- |
| `apps/site` | TanStack Start app: UI, routes, client data layer |
| `packages/*` | Shared libraries (e.g. `isomorphic` types, configs) |
| Root | `package.json` scripts, Turbo pipeline, Vite+ CLI (`vp`) |

---

## Frontend (`apps/site`)

- **TanStack Router** — File-based routes under `src/routes/`; `routeTree.gen.ts` is generated.
- **TanStack Query** — Server/client data fetching; SSR integration via `@tanstack/react-router-ssr-query`.
- **Styling** — Tailwind CSS v4, shadcn-style UI primitives, DaisyUI theme tokens where needed.
- **Auth** — Better Auth (client + server); protect routes with `beforeLoad` / middleware as in `_dashboard` layout.

Router bootstrap lives in `apps/site/src/router.tsx` (pending/not-found/error defaults, query integration).

---

## Tooling (Vite+)

- **`vp`** — Install, dev, build, lint, format, test (see project `CLAUDE.md`).
- Prefer **`vp install` / `vp check` / `vp test`** over calling underlying package managers or Vitest/Oxlint directly.

---

## Environment (examples)

Use names that match your deployment; placeholders only:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/app?sslmode=require
REDIS_URL=redis://localhost:6379
S3_BUCKET=your-bucket
S3_PUBLIC_URL=https://cdn.example.com
EMAIL_FROM="App <hello@example.com>"
```

---

## Customization checklist

1. Update `AppConfig` (name, links, `themeStorageKey`, OG URLs in `src/routes/__root.tsx` if you use absolute Open Graph URLs).
2. Replace placeholder landing copy and assets under `apps/site/public/`.
3. Align `packages/isomorphic` roles and API contracts with your backend.
4. Configure CI (e.g. `voidzero-dev/setup-vp`) to run `vp check` and `vp test`.

---

## Further reading

- [TanStack Start](https://tanstack.com/start)
- [TanStack Router](https://tanstack.com/router)
- [Vite+](https://github.com/voidzero-dev/vite-plus) (project `CLAUDE.md`)
