# Technical architecture — Agentic JSON Resume

## Product (what this repo is for)

**Agentic JSON Resume** is a web app for maintaining a **structured JSON résumé**, using **any LLM** to tailor that JSON to a job description, and **exporting PDF** from the same source so layout stays under your control. See `VISION.md` for the full product narrative.

The codebase is a **pnpm + Turbo** monorepo with **Vite+** tooling and **`apps/site`** as a **TanStack Start** app (TanStack Router, TanStack Query, SSR-capable React).

Branding and copy live in `apps/site/src/utils/system.tsx` (`AppConfig`).

---

## Repository layout

| Path         | Role                                                           |
| ------------ | -------------------------------------------------------------- |
| `apps/site`  | TanStack Start app: UI, routes, auth, future JSON editor + PDF |
| `packages/*` | Shared libraries (types, configs)                              |
| Root         | `package.json` scripts, Turbo pipeline, Vite+ CLI (`vp`)       |

---

## Frontend (`apps/site`)

- **TanStack Router** — File-based routes under `src/routes/`; `routeTree.gen.ts` is generated.
- **TanStack Query** — Data fetching; SSR integration via `@tanstack/react-router-ssr-query`.
- **Styling** — Tailwind CSS v4, shadcn-style UI, DaisyUI theme tokens where needed.
- **Auth** — Better Auth; dashboard routes can be protected with `beforeLoad` / middleware.

Planned product modules: **JSON schema** for résumé, **preview** components, **PDF** generation (e.g. print CSS, `@react-pdf/renderer`, or server-side render-to-PDF)—to be added as you implement the builder.

---

## Tooling (Vite+)

- **`vp`** — Install, dev, build, lint, format, test (see `CLAUDE.md`).
- Prefer **`vp install` / `vp check` / `vp test`** over ad hoc package-manager or tool invocations.

---

## Environment (examples)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/app?sslmode=require
# Add secrets for auth, email, and future PDF storage as needed
```

---

## Customization

1. Set `AppConfig` and absolute OG URLs in `src/routes/__root.tsx` when you have a production domain.
2. Implement the résumé JSON types (e.g. under `packages/isomorphic`) and the editor + PDF pipeline in `apps/site`.

---

## Further reading

- [TanStack Start](https://tanstack.com/start)
- [TanStack Router](https://tanstack.com/router)
- Vite+ (`CLAUDE.md` in this repo)
