# Agentic JSON Resume

Résumé as typed JSON. Tweak it with any LLM, edit it by hand. Export a clean PDF, same result every time. Store sections individually so you can reuse and remix them later, reassemble everything back into a polished PDF whenever you need.

---

## What is this?

The usual résumé workflow sucks. You tailor it for a job, paste it into Google Docs or Word, spend an hour making the formatting look right, and six months later you need a different version and can't remember what changed. Or you ask an LLM to rewrite it, get back a pile of text, and do the whole formatting dance over again.

This keeps your résumé as JSON — structured sections you own entirely. You can feed the whole thing (or just the parts you want) into any LLM alongside a job description and get back revised JSON that fits the same schema. You can edit it in the app, by hand in a text editor, wherever. When you export, it's the same PDF layout every time because the layout is code, not a document.

The real win is that sections stay separate. Your experience section is its own block, your skills are their own block. You can shuffle them around, copy them between versions, or build a totally different resume from the same source data. Export whatever you need whenever you need it.

No vendor lock-in, no waiting for some background service, no proprietary format. Just JSON and React components that turn it into a PDF.

---

## Stack

| Layer         | Choice                             |
| ------------- | ---------------------------------- |
| Monorepo      | pnpm workspaces + Turbo            |
| App framework | TanStack Start (SSR-capable React) |
| Routing       | TanStack Router (file-based)       |
| Data fetching | TanStack Query                     |
| Styling       | Tailwind CSS v4 + DaisyUI tokens   |
| Auth          | Better Auth                        |
| Tooling       | Vite+ (`vp` CLI)                   |

- **Package name:** `agentic-json-resume` (root `package.json`)
- **App branding:** `apps/site/src/utils/system.tsx` (`AppConfig`)

## Scripts

```bash
pnpm install
pnpm dev
```

Use **`vp`** from the repo root for lint/format/test per `CLAUDE.md` (e.g. `vp check`).

## Docs

- `VISION.md` — product problem, JSON+LLM loop, future “agentic” direction.
- `ARCHITECTURE.md` — how the repo is organized and where the builder will plug in.

## License

Add your license.
