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
| `GET`  | `/api/admin/waitlist`        | Existing cursor-paginated waitlist                    |
| `GET`  | `/api/admin/credits/:userId` | Existing user credit balance                          |

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
blobs, and synced identity/ownership/foreign-key columns cannot be edited.

Synced row updates and deletes append `server-admin` sync events in the same
transaction. Owned experience/education bullets are removed before their parent
and receive delete events too. Truncate previews are recomputed by the mutation;
the preview is never trusted as authorization.

`sync_event`, `sync_backend` and `__drizzle_migrations` are read-only. Event-log
truncate previews report `mode: "eventLog"`, but `POST` returns `501` until Nest
owns sync projection, compaction, backup and rebuild. Those operations remain on
the existing web server functions.

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
