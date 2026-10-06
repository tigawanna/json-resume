# Event sync (local-first vs managed)

The browser SQLite event log is the source of truth for anyone who never syncs. Opening the workbench can still require a session for the app shell; that is not the same as sending events upstream.

## Offline

Mutations always append to the local **outbox**. `syncEnabled` starts false. Nothing is POSTed until the user turns on **Managed sync** in Settings _and_ they have a signed-in session.

## Managed sync

- Client transport: `POST` / `GET` `/api/sync/events` with cookie credentials.
- No session → **401**. The client must not enable sync in that case.
- The server **ignores** any user id on the payload and writes `sync_event.user_id` from the session.
- Pull is `WHERE user_id = session.user.id AND global_seq > since`.
- Local collection rows are not rewritten with a user id for ownership; on the client, whatever is in OPFS is yours.

## Legacy tables

`resume`, `saved_project`, and the rest of the existing Drizzle tables remain the surface for REST/MCP. They are a **projection** of `sync_event`, not a second source of truth.

- After a successful push, a bounded projector applies unprojected events in `global_seq` order.
- Catch-up: `GET` or `POST /api/cron/project-sync-events` with `Authorization: Bearer $CRON_SECRET` (or `x-cron-secret`). Requires `CRON_SECRET` in the server env.
- Vercel Cron calls that path daily at 03:00 UTC (`apps/web/vercel.json`). One bad event is stamped and skipped so it cannot pin the queue.
- The local `settings` collection is never projected.
