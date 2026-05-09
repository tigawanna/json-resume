# Agentic JSON Resume

Résumé as typed JSON. Tweak it with any LLM, edit it by hand. Export a clean PDF, same result every time. Store sections individually so you can reuse and remix them later, reassemble everything back into a polished PDF whenever you need.

---

## What is this?

The usual résumé workflow sucks. You tailor it for a job, paste it into Google Docs or Word, spend an hour making the formatting look right, and six months later you need a different version and can't remember what changed. Or you ask an LLM to rewrite it, get back a pile of text, and do the whole formatting dance over again.

This keeps your résumé as JSON — structured sections you own entirely. You can feed the whole thing (or just the parts you want) into any LLM alongside a job description and get back revised JSON that fits the same schema. You can edit it in the app, by hand in a text editor, wherever. When you export, it's the same PDF layout every time because the layout is code, not a document.

The real win is that sections stay separate. Your experience section is its own block, your skills are their own block. You can shuffle them around, copy them between versions, or build a totally different resume from the same source data. Export whatever you need whenever you need it.

No vendor lock-in, no waiting for some background service, no proprietary format. Just JSON and React components that turn it into a PDF.

---

![json tab](https://github.com/tigawanna/json-resume/blob/dc7044922577fd5e0e125241885c476f7f3692e3/apps/web/docs/json_tab.png)

![Ai chatbot tab](https://github.com/tigawanna/json-resume/raw/dc7044922577fd5e0e125241885c476f7f3692e3/apps/web/docs/ai_tab.png)

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

## AI Assistant

The resume workbench has a built-in AI assistant that can analyze job fit, rewrite summaries, and plan tailored drafts.

**No server-side API keys are stored.** You bring your own key:

1. Open any resume and go to the **AI** tab.
2. Expand **AI Provider Settings**, paste your [OpenRouter API key](https://openrouter.ai/keys), and pick a model.
3. Choose whether the key is stored in `localStorage` (persists across tabs) or `sessionStorage` (cleared on tab close).
4. For hosted OpenRouter chat, the key is sent to this app's server for the duration of each AI request, forwarded to OpenRouter, and never persisted server-side.

**Local testing with LM Studio** — no key needed, just set two env vars:

```bash
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=gemma-3-12b-it   # match the identifier shown in LM Studio
```

When `LMSTUDIO_BASE_URL` is set, the server ignores any key sent by the client and routes all requests to LM Studio instead.

See `apps/web/src/features/agentic-tools/README.md` for the full AI layer reference.

## Docs

- `VISION.md` — product problem, JSON+LLM loop, future “agentic” direction.
- `ARCHITECTURE.md` — how the repo is organized and where the builder will plug in.

## License

Add your license.
