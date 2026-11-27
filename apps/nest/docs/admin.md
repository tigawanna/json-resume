# Admin API

All `/api/admin/*` product routes require an authenticated, unbanned user whose
`role` contains `admin`. Controllers enforce this with the global
`AppAuthGuard` and class-level `@Roles({ roles: ['admin'] })`.

## Dashboard

| Method | Path                         | Purpose                                               |
| ------ | ---------------------------- | ----------------------------------------------------- |
| `GET`  | `/api/admin/session`         | Admin role probe                                      |
| `GET`  | `/api/admin/stats`           | Users, résumés, jobs, sync events and active sessions |
| `GET`  | `/api/admin/users`           | Safe user list with résumé and sync-event counts      |
| `GET`  | `/api/admin/waitlist`        | Search/filter waitlist with linked account emails     |
| `GET`  | `/api/admin/waitlist/stats`  | Joined, linked, and removed counts                   |
| `GET`  | `/api/admin/waitlist/export` | CSV export                                            |
| `PATCH`| `/api/admin/waitlist/entries/:id` | Update status, linked user, or notes            |
| `GET`  | `/api/admin/credits/:userId` | Allocation-free wallet read                           |
| `GET`  | `/api/admin/credits/:userId/ledger` | Offset-paginated ledger                       |
| `POST` | `/api/admin/credits/:userId/grants` | Grant bonus credits                      |
| `PATCH`| `/api/admin/credits/:userId` | Signed monthly/bonus adjustment                      |

`GET /api/admin/users` returns an array, ordered by name. Each row contains
`id`, `name`, `email`, `role`, `emailVerified`, `banned`, epoch-millisecond
`createdAt`, `events` and `resumes`.

## Database table browser

| Method   | Path                                   | Purpose                                            |
| -------- | -------------------------------------- | -------------------------------------------------- |
| `GET`    | `/api/admin/tables`                    | Physical rowid tables, row counts and columns      |
| `GET`    | `/api/admin/tables/:table`             | Zero-based page (`page`, `pageSize`, optional `q`) |
| `GET`    | `/api/admin/tables/:table/rows/:rowid` | Row fields and editability                         |
| `PATCH`  | `/api/admin/tables/:table/rows/:rowid` | Update editable cells                              |
| `DELETE` | `/api/admin/tables/:table/rows/:rowid` | Delete a row and owned sync children               |
| `GET`    | `/api/admin/tables/:table/truncate`    | Preview all rows or a date cutoff                  |
| `POST`   | `/api/admin/tables/:table/truncate`    | Truncate after exact-name confirmation             |

The browser discovers tables remotely; table and column identifiers are always
validated against SQLite metadata and quoted before interpolation. Search values
and row values are bound parameters. Password/token/secret/private-key columns,
API keys and verification values are masked. Primary keys, secret columns,
`updated_at`, blobs, and synced identity/ownership/foreign-key columns cannot be
edited. Boolean columns accept `"true"` / `"false"` as well as `1` / `0`.

Synced row updates and deletes append `server-admin` sync events in the same
transaction. Owned experience/education bullets are removed before their parent
and receive delete events too. Truncate previews are recomputed by the mutation;
the preview is never trusted as authorization. Local-only résumé AI chat tables
block parent truncation instead of being silently cascade-deleted.

`sync_event`, `sync_backend` and `__drizzle_migrations` are read-only in the row browser. Event-log truncate previews list backups, and `POST /api/admin/tables/sync_event/truncate` projects pending events, backs up the log, empties it, and optionally rebuilds every user log.

## Event log maintenance

| Method | Path | Purpose |
| ------ | --- | ------- |
| `GET`  | `/api/admin/event-log/backups` | List `sync_event_backup_YYYYMMDDHHMMSS` tables |
| `POST` | `/api/admin/event-log/backups` | Copy the log into a new backup table |
| `POST` | `/api/admin/event-log/backups/:table/restore` | Additively restore a backup |
| `POST` | `/api/admin/event-log/backups/:table/drop` | Drop a backup after exact-name confirmation |
| `POST` | `/api/admin/event-log/empty` | Back up and empty the log, optionally rebuilding it |
| `POST` | `/api/admin/event-log/projection` | Apply pending events to projected tables |
| `POST` | `/api/admin/event-log/rebuild` | Rebuild every user's log from live rows |
| `POST` | `/api/admin/event-log/rebuild/:userId` | Rebuild one user's log from live rows |
| `POST` | `/api/admin/event-log/squash` | Remove superseded events after a retention window |

Projection, rebuild, and squash share the collection registry used by the table browser. Rebuild writes one `insert` per live row plus a `__sync_reset__` marker, so affected devices wipe and repull. Squash planning comes from `@repo/isomorphic/sync/squash-plan`.

## Audit logging

`AdminAuditService` is the Nest equivalent of `admin-audit.server.ts`. Every
admin mutation writes one structured `adminAction` log containing:

- action and authenticated actor (`id`, `email`)
- redacted input (edited values and truncate confirmation are never logged)
- outcome (`success` or `error`)
- duration and result or error message

This is structured application logging, matching the existing web wide-event
behavior; it is not a new database audit table. Table mutations, waitlist
add/remove and credit adjustments all use it.
