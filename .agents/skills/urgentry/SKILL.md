---
name: urgentry
description: >-
  Query the local Urgentry error store (Sentry-compatible) for captured issues
  and prove the DSN path. Use when the user mentions Urgentry, Sentry issues,
  captured exceptions, crash reports, or whether an error was recorded. Do not
  open ~/.urgentry SQLite.
---

# Urgentry

Urgentry is a local Sentry-compatible server. This app sends errors with the Sentry SDK using `VITE_SENTRY_DSN` in `apps/web/.env`. `apps/web/scripts/urgentry.ts` is the reader. Do not query `~/.urgentry/*.db`.

Run from the web package:

```bash
pnpm --dir apps/web urgentry status
pnpm --dir apps/web urgentry issues
pnpm --dir apps/web urgentry prove
```

| Command  | What it does                                                                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status` | Hits `/api/0/`, finds the org and project for the DSN, and checks the public key against `/api/0/projects/{org}/{project}/keys/`.                          |
| `issues` | Lists issues from `/api/0/projects/{org}/{project}/issues/` as `id`, `title`, `count`, `lastSeen`.                                                         |
| `prove`  | POSTs one error event to `/api/{projectId}/store/` and polls issues until that title appears. Use this only to test the pipeline. It creates a real issue. |

Auth: `URGENTRY_TOKEN`, otherwise the `pat=` line in `~/.urgentry/bootstrap-credentials.txt`. DSN: `URGENTRY_DSN`, otherwise `VITE_SENTRY_DSN`.

`urgentry serve` must already be running. If `status` fails to connect, say the server is down. Do not start it unless the user asks.

When checking whether a thrown error was captured, run `issues` and match `title` and `lastSeen`. A missing row means Urgentry did not ingest it. Do not treat evlog files as a substitute.
