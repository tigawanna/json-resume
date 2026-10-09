# Agentic Resume Tooling Handoff

This folder is the shared server-only tool layer for agentic resume workflows.

The current implementation exposes these read-only, Drizzle-backed tools through MCP, oRPC and OpenAPI-compatible HTTP routes:

- `list_resumes`
- `get_resume` (shared view with item ids and the linked job; `resumeId` is required remotely)
- `search_resume_blocks`

Résumé documents are assembled from each résumé's `layout` column (see `todos/resume-layout.md`). There are no server write tools: résumé edits happen in the browser's local collections and sync to the server as events, so a server-side write would bypass the event log.

Do not duplicate the query logic for future work. Add thin adapters that validate input, authenticate the caller, and call the functions in `resume-tools.server.ts`, or go through the typed server-side oRPC client when you already have a trusted user id.

## Existing Files

- `resume-tool-schemas.ts`
  Shared Zod input and output schemas. Use these schemas for MCP, oRPC procedures, OpenAPI generation, and TanStack AI tool wrappers.

- `resume-tools.server.ts`
  Server-only implementations. These functions take `{ userId }` plus a validated input object, enforce ownership, and query Drizzle.

- `resume-orpc.server.ts`
  The shared oRPC router, auth middleware, RPC/OpenAPI handlers, OpenAPI generator, and internal typed server client factory.

- `resume-orpc-client.server.ts`
  Tiny server-only re-export for consumers like MCP and AI orchestration.

- `definitions/`
  Isomorphic TanStack AI `toolDefinition()`s (name, description, schemas, MCP annotations), one file per domain (`resume-`, `job-`, `library-definitions.ts`). The single contract for chat, MCP and oRPC. `tool-context.ts` holds `LocalToolContext` (browser tools, with the active résumé getter/setter) and `RemoteToolContext` (`{ userId }`).

- `shared/`
  Pure isomorphic logic both implementations call: `resume-view.ts` (the `get_resume` output) and `search-page.ts` (search terms and paging).

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
POST /api/agentic/resume-blocks/search
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

Every current procedure uses read permission (list resumes, get resume, search resume blocks). `resumeWriteProcedure` is kept for future server writes, which would have to go through the event log.

Do not enable Better Auth `enableSessionForAPIKeys` unless deliberately changing the auth model. The helper verifies API keys directly and avoids pretending API keys are cookie sessions.

Example request:

```bash
curl -X POST "$APP_URL/api/agentic/resume-blocks/search" \
  -H "content-type: application/json" \
  -H "x-api-key: $AGENTIC_JSON_RESUME_API_KEY" \
  --data '{"keyword":"react","limitPerType":5}'
```

## TanStack AI Layer

The first slice is implemented:

- `src/routes/_dashboard/-ai/-utils/stream-resume-chat.server.ts` — TanStack AI orchestration; builds the adapter and streams the chat with `maxIterations(16)`. Tools are declared without server implementations.
- `openrouter-models.ts` — full `OPENROUTER_MODELS` runtime array + derived `OpenRouterModel` type. The `@tanstack/ai-openrouter` package ships the model list only in TypeScript source (not in the compiled dist), so this file is the runtime source of truth.
- `AiSettingsPanel.tsx` — collapsible settings card rendered inside the AI tab. Houses the API key input, searchable model combobox, and storage type toggle.
- `src/routes/api/ai/event-sourced-resume-tailor.ts` — session-protected SSE route; extracts `apiKey` and `model` from the request body and forwards them to `streamEventSourcedResumeAgentChat`.
- `src/routes/_dashboard/-ai/-components/EventSourcedResumeAiTab.tsx` — reads credentials from the browser and passes them in the `useChat` body on every request.

Current AI tools (`definitions/`, with browser implementations in `routes/_dashboard/-ai/-utils/client-tools.ts`) run against the local collections (`local-resume-tools.ts`, `local-job-tools.ts`), so edits sync as events like any other change. They target the **active résumé**: it starts as the one open in the editor, and `set_active_resume` moves it (held in a ref by `use-event-sourced-resume-ai.ts` and sent to the prompt as `activeResumeId`):

- `list_resumes`, `get_resume`, `set_active_resume`, `search_current_resume_blocks`
- `update_current_resume_document`, `clone_current_resume`, `create_resume_from_document`
- `navigate_to_resume`
- `save_job`, `list_jobs`, `attach_job_to_current_resume`

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

The `AiSettingsPanel` combobox lists every model in `openrouter-models.ts`. The default is `deepseek/deepseek-chat-v3-0324` — cheap and capable for resume tailoring. Any model in the list can be selected; the string is passed verbatim to OpenRouter.

To add a newly released model: append its OpenRouter model id to `OPENROUTER_MODELS` in `openrouter-models.ts`. The `OpenRouterModel` type is derived from that array so no other changes are needed.

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

The current assistant is intentionally conservative:

1. It can inspect the active resume and search reusable blocks.
2. It should not invent work history or metrics.
3. It only saves a new draft when the user explicitly asks.
4. It is a first integration slice, not the final tailoring workflow.

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

Add these only when the first API and agent loop are working:

- `rank_resume_blocks_for_job`
- `create_tailored_resume_draft`
- `diff_resume_documents`

For ranking or tailoring tools, keep model calls outside `resume-tools.server.ts` unless the tool is explicitly AI-powered. The current file should stay mostly deterministic database logic.
