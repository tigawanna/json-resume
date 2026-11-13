# Port backend to Hono RPC

Reference implementation (when in doubt): `/home/dennis/Desktop/code/fullstack/tangerine` — same Hono + Better Auth + Drizzle + evlog setup, including web + desktop (Electron/Deno) auth. Mirror its `apps/api`, `packages/auth`, `docs/auth.md`, `docs/vercel-deploy.md`.<|end|>

## Status legend

- ✅ done (scaffold: health, viewer, me)
- 🔲 todo
- ➖ keep in web (UI-only / not backend, e.g. SSR helpers)

## Auth / session

| #   | Legacy                                           | Method | Auth           | Hono target                     | Notes                                                   |
| --- | ------------------------------------------------ | ------ | -------------- | ------------------------------- | ------------------------------------------------------- |
| 1   | `lib/better-auth/auth.functions.ts` `getSession` | GET    | none           | `apps/api` `/viewer` (done)     | Better Auth `getSession`; cookie-based.                 |
| 2   | `ensureSession`                                  | GET    | session        | `/viewer` + 401 (done)          | Throw/401 when no session.                              |
| 3   | `deleteAccount`                                  | POST   | session+admin? | `/admin/users` or `/me`         | Calls `auth.api.removeUser`; keep admin-gated.          |
| 4   | `src/routes/api/auth/$`                          | *      | none           | already in `apps/api` `/auth/*` | Remove TanStack route once web proxies/uses API origin. |

## Resume core (event-sourced)

| #   | Legacy                                                                         | Method   | Auth    | Hono target                            | Notes                                       |
| --- | ------------------------------------------------------------------------------ | -------- | ------- | -------------------------------------- | ------------------------------------------- |
| 5   | `resume.functions.ts` `listResumes`                                            | GET      | session | `/resumes`                             | query `{ id?, keyword? }`.                  |
| 6   | `getResume`                                                                    | GET      | session | `/resumes/:id`                         | path param.                                 |
| 7   | `resume-projects` `listResumeProjects` / `deleteResumeProjectFn`               | GET/POST | session | `/resume-projects`                     |                                             |
| 8   | `certifications` `listCertifications` / `deleteCertificationFn`                | GET/POST | session | `/certifications`                      |                                             |
| 9   | `contacts` `listContacts` / `deleteContactFn`                                  | GET/POST | session | `/contacts`                            |                                             |
| 10  | `education` `listEducation` / `deleteEducationFn`                              | GET/POST | session | `/education`                           |                                             |
| 11  | `experiences` `listExperiences` / `deleteExperienceFn` / `reorderExperienceFn` | GET/POST | session | `/experiences`                         | reorder takes `{ idA, idB }`.               |
| 12  | `languages` `listLanguages` / `deleteLanguageFn`                               | GET/POST | session | `/languages`                           |                                             |
| 13  | `links` `listLinks` / `deleteLinkFn`                                           | GET/POST | session | `/links`                               |                                             |
| 14  | `skill-groups` `listSkillGroups` / `deleteSkillGroupFn`                        | GET/POST | session | `/skill-groups`                        |                                             |
| 15  | `summaries` `listSummaries` / `deleteSummaryFn`                                | GET/POST | session | `/summaries`                           |                                             |
| 16  | `talks` `listTalks` / `deleteTalkFn`                                           | GET/POST | session | `/talks`                               |                                             |
| 17  | `volunteers` `listVolunteers` / `deleteVolunteerFn`                            | GET/POST | session | `/volunteers`                          |                                             |
| 18  | `ai-chat` `getResumeAiChat` / `saveResumeAiChat` / `clearResumeAiChat`         | GET/POST | session | `/resume-ai-chat`                      |                                             |
| 19  | `resume.server.ts` (event-sourced CRUD, snapshot)                              | *        | session | `/resume-events` or keep in sync layer | large; needs `@repo/db` tables moved first. |

## Resume AI chat (streaming)

| #   | Legacy                                                       | Method     | Auth    | Hono target                       | Notes                            |
| --- | ------------------------------------------------------------ | ---------- | ------- | --------------------------------- | -------------------------------- |
| 20  | `src/routes/api/ai/dashboard-assistant`                      | POST (SSE) | session | `/ai/dashboard-assistant`         | streaming; use Hono `streamSSE`. |
| 21  | `src/routes/api/ai/event-sourced-resume-tailor`              | POST (SSE) | session | `/ai/event-sourced-resume-tailor` |                                  |
| 22  | `src/routes/api/ai/chat-lab`                                 | POST (SSE) | session | `/ai/chat-lab`                    |                                  |
| 23  | `src/routes/api/ai/dashboard-chat` (deleted in working tree) | POST (SSE) | session | `/ai/dashboard-chat`              |                                  |
| 24  | `src/routes/api/ai/experience-agent` (deleted)               | POST (SSE) | session | `/ai/experience-agent`            |                                  |

## Public resume

| #   | Legacy                                                | Method | Auth    | Hono target                            | Notes |
| --- | ----------------------------------------------------- | ------ | ------- | -------------------------------------- | ----- |
| 25  | `public-resume.functions.ts` `getPublicResume`        | GET    | none    | `/public-resumes/:id`                  |       |
| 26  | `getMyPublicResume`                                   | GET    | session | `/public-resumes/mine/:sourceResumeId` |       |
| 27  | `listMyPublicResumes`                                 | GET    | session | `/public-resumes/mine`                 |       |
| 28  | `publishPublicResume`                                 | POST   | session | `/public-resumes`                      |       |
| 29  | `renamePublicResume`                                  | POST   | session | `/public-resumes/:id/rename`           |       |
| 30  | `unpublishPublicResume` / `unpublishPublicResumeById` | POST   | session | `/public-resumes/:id/unpublish`        |       |

## GitHub / saved projects

| #   | Legacy                                          | Method | Auth    | Hono target                | Notes |
| --- | ----------------------------------------------- | ------ | ------- | -------------------------- | ----- |
| 31  | `github/repos.functions.ts` `getGithubRepos`    | GET    | session | `/github/repos`            |       |
| 32  | `searchGithubRepos`                             | GET    | session | `/github/search`           |       |
| 33  | `saved-project.functions.ts` `getSavedProjects` | GET    | session | `/saved-projects`          |       |
| 34  | `saveGithubProject`                             | POST   | session | `/saved-projects`          |       |
| 35  | `unsaveGithubProject`                           | POST   | session | `/saved-projects` (DELETE) |       |

## API keys

| #   | Legacy                                   | Method | Auth    | Hono target | Notes                                      |
| --- | ---------------------------------------- | ------ | ------- | ----------- | ------------------------------------------ |
| 36  | `api-keys.functions.ts` `createApiKeyFn` | POST   | session | `/api-keys` | uses `@better-auth/api-key`; reuse client. |

## Sync

| #   | Legacy                                    | Method   | Auth        | Hono target                 | Notes                             |
| --- | ----------------------------------------- | -------- | ----------- | --------------------------- | --------------------------------- |
| 37  | `src/routes/api/sync/events`              | POST     | session     | `/sync/events`              | push/pull batch; keep zod schema. |
| 38  | `src/routes/api/sync/compact`             | POST     | session     | `/sync/compact`             |                                   |
| 39  | `src/routes/api/cron/project-sync-events` | GET/POST | cron secret | `/cron/project-sync-events` | keep `CRON_SECRET` check.         |
| 40  | `src/routes/api/cron/squash-sync-events`  | GET/POST | cron secret | `/cron/squash-sync-events`  |                                   |

## Admin

| #   | Legacy                                                                    | Method   | Auth  | Hono target                        | Notes |
| --- | ------------------------------------------------------------------------- | -------- | ----- | ---------------------------------- | ----- |
| 41  | `admin.functions.ts` `getAdminStats`                                      | GET      | admin | `/admin/stats`                     |       |
| 42  | `getAdminTables`                                                          | GET      | admin | `/admin/tables`                    |       |
| 43  | `getAdminTablePage`                                                       | GET      | admin | `/admin/tables/:table`             |       |
| 44  | `getAdminUsers`                                                           | GET      | admin | `/admin/users`                     |       |
| 45  | `getAdminEvents` / `getAdminEventsByCollection` / `getAdminEventUsers`    | GET      | admin | `/admin/events`                    |       |
| 46  | `getAdminRow` / `updateAdminRowFn` / `deleteAdminRowFn`                   | GET/POST | admin | `/admin/rows`                      |       |
| 47  | `getAdminTruncatePreview` / `truncateAdminTableFn`                        | GET/POST | admin | `/admin/truncate`                  |       |
| 48  | `getEventLogBackups` / `restoreEventLogBackupFn` / `dropEventLogBackupFn` | GET/POST | admin | `/admin/event-log-backups`         |       |
| 49  | `squashEventLogFn` / `projectPendingEventsFn`                             | POST     | admin | `/admin/squash` / `/admin/project` |       |
| 50  | `compactLibraryFn` / `pruneLibraryFn`                                     | POST     | admin | `/admin/compact` / `/admin/prune`  |       |
| 51  | `rebuildAllEventLogsFn` / `rebuildEventLog`                               | POST     | admin | `/admin/rebuild`                   |       |
| 52  | `backupAndEmptyEventLogFn`                                                | POST     | admin | `/admin/backup-and-empty`          |       |

## Agentic / MCP / misc

| #   | Legacy                                                             | Method | Auth     | Hono target                          | Notes                                               |
| --- | ------------------------------------------------------------------ | ------ | -------- | ------------------------------------ | --------------------------------------------------- |
| 53  | `src/routes/api/agentic/rpc/$` (oRPC)                              | *      | session  | `/agentic/*` or keep oRPC mounted    | large; decide whether to keep oRPC or port to Hono. |
| 54  | `src/routes/api/agentic/openapi(.json)`                            | GET    | none     | `/agentic/openapi.json`              |                                                     |
| 55  | `src/routes/api/mcp`                                               | *      | session? | `/mcp`                               | MCP server endpoint.                                |
| 56  | `src/routes/api/ai/-utils/*` (hosted-ai-session, same-origin-cors) | helper | —        | move helpers into `apps/api/src/lib` |                                                     |

## Shared DB tables to move into `@repo/db`

Currently only `auth-schema` is shared. As routes migrate, move these schemas (and their relations) too:

- resume, resume-experience, resume-experience-bullet, resume-education, resume-education-bullet, resume-skill-group, resume-skill, resume-contact, resume-project, resume-summary, resume-note, resume-link, resume-language, resume-certification, resume-volunteer, resume-talk, resume-ai-chat, resume-ai-conversation, resume-ai-message
- saved-project, job, cover-letter, application-answer, assistant-skill, settings
- sync-backend, sync-event, sync-squash-state
- public-resume, apikey (already in auth-schema), user/session/account/verification

Also move the corresponding `*.server.ts` modules (`resume.server.ts`, `sync-events.server.ts`, etc.) into `apps/api/src/services/` and update the web's data-access layer to call `honoClient`.

## Suggested order

1. Auth + viewer + me ✅ (done)
2. Resume CRUD list/delete endpoints (move resume + child schemas)
3. Public resume
4. GitHub + saved projects + api keys
5. Sync (events + compact + cron)
6. AI streaming (SSE) endpoints
7. Admin (largest surface; can stay last)
8. Agentic oRPC + MCP (decide keep vs port)
9. Delete legacy `createServerFn` and `src/routes/api/*` once nothing references them.
