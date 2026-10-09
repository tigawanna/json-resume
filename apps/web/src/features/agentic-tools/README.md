# Agentic Resume Tooling Handoff

This folder is the shared server-only tool layer for agentic resume workflows.

The current implementation exposes these read-only, Drizzle-backed tools through MCP, oRPC and OpenAPI-compatible HTTP routes:

- `list_resumes`
- `get_resume` (shared view with item ids and the linked job; `resumeId` is required remotely)
- `search_library` (one library section per call, with search/paging; `resumeId` flags what that résumé shows)
- `rank_resumes_for_job`, `rank_library_for_job` (keyword coverage of a job, shared scorer in `shared/rank.ts`)
- `list_jobs` (search/paging, with the résumés targeting each job)
- `get_job` (full posting text; by `jobId`, or by `resumeId` remotely)

Résumé documents are assembled from each résumé's `layout` column (see `todos/resume-layout.md`). There are no server write tools: résumé edits happen in the browser's local collections and sync to the server as events, so a server-side write would bypass the event log.

Do not duplicate the query logic for future work. Add thin adapters that validate input, authenticate the caller, and call the functions in `resume-tools.server.ts`, or go through the typed server-side oRPC client when you already have a trusted user id.

## Existing Files

- `resume-tool-schemas.ts`
  Shared Zod input and output schemas. Use these schemas for MCP, oRPC procedures, OpenAPI generation, and TanStack AI tool wrappers.

- `resume-tools.server.ts`, `job-tools.server.ts`, `library-tools.server.ts`, `rank-tools.server.ts`
  Server-only implementations. These functions take `{ userId }` plus a validated input object, enforce ownership, and query Drizzle.

- `resume-orpc.server.ts`
  The shared oRPC router, auth middleware, RPC/OpenAPI handlers, OpenAPI generator, and internal typed server client factory.

- `resume-orpc-client.server.ts`
  Tiny server-only re-export for consumers like MCP and AI orchestration.

- `definitions/`
  Isomorphic TanStack AI `toolDefinition()`s (name, description, schemas, MCP annotations, `needsApproval`, `lazy`), one file per domain (`resume-`, `resume-edit-`, `job-`, `library-`, `assistant-definitions.ts`). The single contract for chat, MCP and oRPC. `tool-context.ts` holds `LocalToolContext` (browser tools, with the active résumé getter/setter) and `RemoteToolContext` (`{ userId }`).

- `shared/`
  Pure isomorphic logic both implementations call: `resume-view.ts` (the `get_resume` output), `job-view.ts` (job rows), `library-view.ts` (library hits), `rank.ts` (keyword scorer), `search-page.ts` (search terms and paging) and `playbooks.ts` (the `get_playbook` text).

- `remote-tools.server.ts`
  `def.server<RemoteToolContext>()` wrappers around the functions in `resume-tools.server.ts`. `remoteResumeTools` is the list MCP serves.

- `resume-mcp.server.ts`
  `createMCPServer({ tools: remoteResumeTools })` from `@tanstack/ai-mcp/server`. The route authenticates the API key, then calls `resumeMcpServer.handle(request, { context: { userId } })`.

- `src/routes/api/mcp.ts`
  Streamable HTTP MCP endpoint protected by a Better Auth API key (`x-api-key` or `Authorization: Bearer`).

- `src/routes/api/agentic/$.ts`
  OpenAPI-compatible catch-all route for `/api/agentic/*`.

- `src/routes/api/agentic/rpc/$.ts`
  RPC protocol catch-all route for `/api/agentic/rpc/*`.

- `src/routes/api/agentic/openapi.json.ts`
  Generated OpenAPI spec endpoint.

- `src/routes/api/ai/event-sourced-resume-tailor.ts`
  Session-protected TanStack AI SSE route used by the resume workbench AI tab (`stream-resume-chat.server.ts`).

- `src/lib/better-auth/api-key.server.ts`
  Helper for API-key auth. It accepts `x-api-key` or `Authorization: Bearer ...`, verifies via Better Auth API key plugin, and returns the user id.

## oRPC API Layer

OpenAPI-compatible endpoints:

```txt
POST /api/agentic/resumes/list
POST /api/agentic/resumes/get
POST /api/agentic/resumes/rank-for-job
POST /api/agentic/library/search
POST /api/agentic/library/rank-for-job
POST /api/agentic/jobs/list
POST /api/agentic/jobs/get
```

All routes also support:

```txt
OPTIONS
```

RPC endpoint for typed clients:

```txt
POST /api/agentic/rpc
POST /api/agentic/rpc/<procedure path>
```

Spec endpoint:

```txt
GET /api/agentic/openapi/json
```

Key behavior:

1. `resume-orpc.server.ts` owns the auth middleware and procedure definitions.
2. External callers authenticate with Better Auth API keys.
3. Internal trusted callers use `createResumeAgenticServerClient(userId)`. MCP calls the remote tools directly.
4. Input and output validation come from the shared definitions in `definitions/`.
5. The OpenAPI catch-all preserves the existing `/api/agentic/...` URLs.
6. The RPC route is the preferred base for typed programmatic clients.
7. Shared CORS headers are applied to both agentic HTTP routes and MCP.

Permission shape:

```ts
const resumeReadPermission = { resumes: ["read"] };
const resumeWritePermission = { resumes: ["write"] };
```

Every current procedure uses read permission (list/get/rank resumes, search/rank the library, list/get jobs). `resumeWriteProcedure` is kept for future server writes, which would have to go through the event log.

Do not enable Better Auth `enableSessionForAPIKeys` unless deliberately changing the auth model. The helper verifies API keys directly and avoids pretending API keys are cookie sessions.

Example request:

```bash
curl -X POST "$APP_URL/api/agentic/library/search" \
  -H "content-type: application/json" \
  -H "x-api-key: $AGENTIC_JSON_RESUME_API_KEY" \
  --data '{"section":"experience_bullet","keyword":"react","limit":5}'
```

## TanStack AI Layer

- `src/routes/_dashboard/-ai/-utils/stream-resume-chat.server.ts` — TanStack AI orchestration; builds the adapter and streams the chat with `maxIterations(16)` and `lazyToolsConfig: { includeDescription: "first-sentence" }`. Tools are declared without server implementations.
- `ModelPicker.tsx` — searchable model list fetched live from the OpenRouter API (`hooks/use-openrouter-models.ts`, `services/openrouter/`).
- `AiSettingsPanel.tsx` — collapsible settings card rendered inside the AI tab. Houses the API key input, model picker, and storage type toggle.
- `src/routes/api/ai/event-sourced-resume-tailor.ts` — session-protected SSE route; extracts `apiKey` and `model` from the request body and forwards them to `streamEventSourcedResumeAgentChat`.
- `src/routes/_dashboard/-ai/-components/EventSourcedResumeAiTab.tsx` — reads credentials from the browser and passes them in the `useChat` body on every request.

Current AI tools (`definitions/chat-tool-definitions.ts`, with browser implementations in `routes/_dashboard/-ai/-utils/client-tools.ts`) run against the local collections (`local-resume-tools.ts`, `local-resume-edit-tools.ts`, `local-resume-lifecycle-tools.ts`, `local-library-tools.ts`, `local-job-tools.ts`), so edits sync as events like any other change. They target the **active résumé**: it starts as the one open in the editor, and `set_active_resume` moves it (held in a ref by `use-event-sourced-resume-ai.ts` and sent to the prompt as `activeResumeId`):

- `list_resumes`, `get_resume`, `set_active_resume`
- `search_library`, `rank_library_for_job`, `attach_library_items` (find existing library rows and put them on the résumé)
- `update_resume_details`, `set_summary`, `set_experience_bullets`, `set_skills`, `set_contacts`, `set_links`, `set_notes`, `reorder_section`, `remove_from_resume`
- `upsert_experience`, `upsert_project`, `upsert_education`, `upsert_talk` (with an `id` they edit the shared library item, so the change shows on every résumé using it)
- `replace_resume_document` (needs approval)
- `clone_resume`, `create_resume`, `tailor_resume_for_job` (each makes the new résumé active), `rank_resumes_for_job`
- `open_resume` (navigates once the reply finishes and carries the conversation to the target résumé)
- `list_jobs`, `get_job`, `save_job`, `update_job`, `attach_job` (`jobId: null` detaches)
- `get_playbook` (the tool order for edit_resume, pasted_job, tailored_copy, fill_from_library, import_resume; static text, so the prompt stays short)
- `undo_last_ai_change` (reverts the last write tool call; call again to step further back)

Rarely used tools are `lazy: true` (`create_resume`, `update_job`, `set_contacts`, `set_links`, `set_notes`, `reorder_section`, `replace_resume_document`, `undo_last_ai_change`). The model sees them by name and first sentence in TanStack AI's `__lazy__tool__discovery__` tool and loads a schema only when it needs one. Only client-only tools are lazy; `get_playbook` stays client-only because its steps name the browser write tools.

Undo: every write tool runs through `journaled()` in `client-tools.ts`, which records the outbox `localSeq` range of that call on `LocalToolContext.changes` (in memory, per chat tab). The event hook allocates the first `localSeq` of each transaction synchronously, so a call owns the transactions that start inside its range. `revertOwnEvents` in `event-history.ts` puts each touched row back to its state before the call (inserted rows are removed), written as new events. Rows edited again since (by the user or another device) are skipped and reported.

The prompt only names the active résumé's job (id and label); the model calls `get_job` when it needs the posting text. `list_jobs` and `get_job` also run remotely (MCP tools and `POST /jobs/list`, `POST /jobs/get`), sharing `shared/job-view.ts` with the local versions. `rank_resumes_for_job` runs remotely too (`POST /resumes/rank-for-job`), sharing the keyword scorer in `shared/rank.ts`.

Tools defined with `needsApproval: true` pause the run. The chat tab renders an Approve / Deny card (`ToolApprovalCard.tsx`) from `useChat`'s bound `interrupts`, and the route forwards `resume`, `threadId`, `runId`, and `parentRunId` into `chat()` so the run continues after the answer.

### API Key Architecture

**No API keys are stored on the server.** The flow is:

```
Browser (AiSettingsPanel)
  → localStorage / sessionStorage  (key + model stored here)
  → useAiSettings hook              (reads storage on mount)
  → useChat body { apiKey, model }  (sent with every POST)
  → /api/ai/event-sourced-resume-tailor  (extracts from body, validates with Zod)
  → streamEventSourcedResumeAgentChat    (passes to buildTextAdapter)
  → OpenRouter API                  (key used here, never persisted)
```

Storage preference (`local` vs `session`) is always kept in `localStorage` so the app knows where to look on the next mount. The credentials themselves (`apiKey` + `model`) live in whichever storage the user chose.

Relevant files:

| File                           | Responsibility                                               |
| ------------------------------ | ------------------------------------------------------------ |
| `src/types/ai-settings.ts`     | `AiSettings`, `AiCredentials`, `AiStorageType` types         |
| `src/hooks/use-ai-settings.ts` | read/write/clear credentials; handles storage-type migration |
| `AiSettingsPanel.tsx`          | UI: key input, model combobox, storage toggle                |

### Switching Models

The model picker lists the models OpenRouter currently serves (live API), with free-only and cheapest-first filters. The chosen id is passed verbatim to OpenRouter, so new models need no code change.

### Local Development with LM Studio

LM Studio exposes an OpenAI-compatible REST API. The server adapter can point to it instead of OpenRouter when two env vars are present:

```bash
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=gemma-3-12b-it
```

Steps:

1. Download [LM Studio](https://lmstudio.ai) and load a model (e.g. `google/gemma-3-12b-it`).
2. Start the local server in LM Studio (default port `1234`).
3. Copy the model identifier shown in LM Studio — it must match `LMSTUDIO_MODEL` exactly.
4. Set the two env vars and restart the dev server.
5. When `LMSTUDIO_BASE_URL` is set, the server ignores the `apiKey` and `model` sent by the client entirely and routes all requests to LM Studio using a dummy key.

`LMSTUDIO_MODEL` defaults to `"gemma-3-12b-it"` if omitted.

The adapter reuse works because the `@openrouter/sdk` `SDKOptions` accepts a `serverURL` override, and LM Studio's API is OpenAI-compatible.

The assistant's ground rules (system prompt in `system-prompt.ts`):

1. It edits the active résumé in place with granular tools; it copies only when the user asks for a copy or variant.
2. It reuses library material (`rank_library_for_job`, `search_library`, `attach_library_items`) before writing new content.
3. It never invents work history or metrics.
4. Whole-résumé rewrites need the user's approval, and its last change can be undone.

## Important Constraints

- Keep `resume-tools.server.ts` server-only.
- Do not import `resume-tools.server.ts` into client components.
- Prefer `createResumeAgenticServerClient(userId)` for trusted server-side consumers instead of bespoke wrappers.
- Do not add `useMemo` or `useCallback`; this repo uses React Compiler.
- Do not cast to `any`. If a third-party SDK forces awkward types, solve with concrete types or ask before using `any`.
- Catch errors as `unknown`.
- Do not manually edit Better Auth generated schema.
- Do not manually edit SQL migrations unless explicitly requested.
- Use Drizzle schema and commands for database changes.
- Prefer efficient selected-column Drizzle queries for tool search.
- Keep tool outputs structured and stable; agents depend on field names.

## Future Tool Ideas

- `diff_resume_documents`
- `search_library` sections for certifications, volunteering and languages

Keep model calls out of the `*-tools.server.ts` files unless a tool is explicitly AI-powered; they should stay deterministic database logic.
