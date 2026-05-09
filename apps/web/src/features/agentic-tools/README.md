# Agentic Resume Tooling Handoff

This folder is the shared server-only tool layer for agentic resume workflows.

The current implementation exposes these Drizzle-backed tools through MCP, oRPC, OpenAPI-compatible HTTP routes, and the first TanStack AI chat workflow:

- `list_resumes`
- `get_resume_document`
- `search_resume_blocks`
- `add_experience_bullet`
- `replace_experience_bullets`
- `create_resume_from_document`

Do not duplicate the query or mutation logic for future work. Add thin adapters that validate input, authenticate the caller, and call the functions in `resume-tools.server.ts`, or go through the typed server-side oRPC client when you already have a trusted user id.

## Existing Files

- `resume-tool-schemas.ts`
  Shared Zod input and output schemas. Use these schemas for MCP, oRPC procedures, OpenAPI generation, and TanStack AI tool wrappers.

- `resume-tools.server.ts`
  Server-only implementations. These functions take `{ userId }` plus a validated input object, enforce ownership where needed, and query/mutate Drizzle.

- `resume-orpc.server.ts`
  The shared oRPC router, auth middleware, RPC/OpenAPI handlers, OpenAPI generator, and internal typed server client factory.

- `resume-orpc-client.server.ts`
  Tiny server-only re-export for consumers like MCP and AI orchestration.

- `resume-mcp.server.ts`
  MCP-specific adapter. It registers the shared functions as MCP tools and now calls the typed server-side oRPC client instead of bespoke glue.

- `resume-agent.server.ts`
  TanStack AI orchestration for the first in-app resume assistant. It uses OpenRouter plus server tools backed by the typed oRPC client.

- `src/routes/api/mcp.ts`
  Streamable HTTP MCP endpoint protected by Better Auth MCP OAuth via `withMcpAuth`.

- `src/routes/api/agentic/$.ts`
  OpenAPI-compatible catch-all route for `/api/agentic/*`.

- `src/routes/api/agentic/rpc/$.ts`
  RPC protocol catch-all route for `/api/agentic/rpc/*`.

- `src/routes/api/agentic/openapi.json.ts`
  Generated OpenAPI spec endpoint.

- `src/routes/api/ai/resume-tailor.ts`
  Session-protected TanStack AI SSE route used by the resume workbench AI tab.

- `src/lib/better-auth/api-key.server.ts`
  Helper for API-key auth. It accepts `x-api-key` or `Authorization: Bearer ...`, verifies via Better Auth API key plugin, and returns the user id.

## oRPC API Layer

OpenAPI-compatible endpoints:

```txt
POST /api/agentic/resumes/list
POST /api/agentic/resumes/document
POST /api/agentic/resume-blocks/search
POST /api/agentic/experience-bullets/add
POST /api/agentic/experience-bullets/replace
POST /api/agentic/resumes/create-from-document
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
3. Internal trusted callers like MCP and TanStack AI use `createResumeAgenticServerClient(userId)`.
4. Input and output validation come from `resume-tool-schemas.ts`.
5. The OpenAPI catch-all preserves the existing `/api/agentic/...` URLs.
6. The RPC route is the preferred base for typed programmatic clients.
7. Shared CORS headers are applied to both agentic HTTP routes and MCP.

Permission shape:

```ts
const resumeReadPermission = { resumes: ["read"] };
const resumeWritePermission = { resumes: ["write"] };
```

Use read permission for:

- list resumes
- get resume document
- search resume blocks

Use write permission for:

- add experience bullet
- replace experience bullets
- create resume from document

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

- `resume-agent.server.ts` — TanStack AI orchestration; builds the adapter and defines the tool loop.
- `openrouter-models.ts` — full `OPENROUTER_MODELS` runtime array + derived `OpenRouterModel` type. The `@tanstack/ai-openrouter` package ships the model list only in TypeScript source (not in the compiled dist), so this file is the runtime source of truth.
- `AiSettingsPanel.tsx` — collapsible settings card rendered inside the AI tab. Houses the API key input, searchable model combobox, and storage type toggle.
- `src/routes/api/ai/resume-tailor.ts` — session-protected SSE route; extracts `apiKey` and `model` from the request body and forwards them to `streamResumeAgentChat`.
- `src/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab.tsx` — uses `useAiSettings` to read credentials from the browser, passes them in the `useChat` body on every request.

Current AI tools are optimized for the active resume rather than the raw public API shape:

- `get_current_resume_document`
- `search_current_resume_blocks`

These tools are backed by the typed server-side oRPC client, not raw fetches.

### API Key Architecture

**No API keys are stored on the server.** The flow is:

```
Browser (AiSettingsPanel)
  → localStorage / sessionStorage  (key + model stored here)
  → useAiSettings hook              (reads storage on mount)
  → useChat body { apiKey, model }  (sent with every POST)
  → /api/ai/resume-tailor           (extracts from body, validates with Zod)
  → streamResumeAgentChat           (passes to buildTextAdapter)
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

- `update_summary`
- `add_project`
- `replace_project`
- `upsert_skill_group`
- `rank_resume_blocks_for_job`
- `create_tailored_resume_draft`
- `diff_resume_documents`

For ranking or tailoring tools, keep model calls outside `resume-tools.server.ts` unless the tool is explicitly AI-powered. The current file should stay mostly deterministic database logic.
