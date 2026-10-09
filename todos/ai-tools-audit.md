# AI tools audit (post-normalization)

Audit of every tool the TanStack AI résumé assistant can call, after the data model moved to
shared library rows (experiences, projects, education, talks, skills, bullets) referenced from
each résumé's `layout`, and jobs moved into their own table linked by `resume.jobId`.

Scope:

- **In-app assistant** — `features/agentic-tools/resume-chat-tool-definitions.ts` (definitions,
  sent to the model by `stream-resume-chat.server.ts`) and
  `routes/_dashboard/-ai/-utils/client-tools.ts` (browser implementations over the local
  collections in `local-resume-tools.ts` / `local-job-tools.ts`).
- **External agents** — `resume-tools.server.ts` exposed via MCP (`resume-mcp.server.ts`) and
  oRPC/OpenAPI (`resume-orpc.server.ts`). Read-only, reads the server DB (lags local until sync).

## Tool architecture (TanStack AI recommendation)

Source: the `ai-core/tool-calling` skill shipped in `@tanstack/ai`
(`node_modules/@tanstack/ai/skills/ai-core/tool-calling/SKILL.md`), the `ai-mcp` skill shipped in
`@tanstack/ai-mcp`, and the `toolDefinition` / `createMCPServer` types.

**One isomorphic definition per tool, many implementations.** `toolDefinition({ name, description,
inputSchema, outputSchema, needsApproval?, lazy?, metadata? })` is the single source of truth.
From it:

- `def.client<LocalToolContext>(execute)`: browser implementation over the TanStack DB collections.
  Registered with `useChat({ tools, context })`. The bare `def` goes to `chat({ tools })` on the
  server so the model knows the schema (the "client tool" pattern; both sides are required).
- `def.server<RemoteToolContext>(execute)`: server implementation over the materialized Drizzle
  tables. Request context (`{ userId }`) is passed in with `chat({ context })` and arrives typed
  as `ctx.context` in `execute`.
- MCP serves the `.server()` tools directly through `createMCPServer({ tools })` from
  `@tanstack/ai-mcp/server`. Our API-key auth runs first, then
  `server.handle(request, { context: { userId } })` puts `userId` on `ctx.context`.
- oRPC procedures use `.input(def.inputSchema).output(def.outputSchema)` and call the same plain
  implementation functions, so every surface advertises the same contract.

A tool name can have only one implementation per `chat()` run. The in-app assistant always uses
the **client** implementation (local data is ahead of the server until sync). The **remote** copies
serve MCP, oRPC/OpenAPI, and any future server-side agent.

**Rules**

1. **Writes are client-only.** A server write would bypass the event log (see `README.md`).
   Remote copies exist only for read tools.
2. **Reads that agents outside the app need get both implementations**, with identical output
   shapes. Pure shaping/scoring logic (document view with ids, job view, keyword ranking) lives
   in one isomorphic module that both implementations call; only the data source differs
   (`assembleResumeDetail` locally, `getResumeDetail` on the server).
3. **Schemas stay in `resume-tool-schemas.ts`.** Definitions import them; oRPC and MCP read them
   from the definition. Top-level input schemas must be `z.object` (MCP rejects anything else).
   Do not use `z.preprocess` in tool inputs: it makes optional fields show up as `required` in
   the JSON Schema the model and MCP clients see. Do not use `z.coerce`: `execute` then receives
   `unknown`. Use plain `.optional()` / `z.number()` and normalize blanks inside the
   implementation. Implementation functions take `z.input<…>` and call `.parse()` themselves,
   because `execute` receives the pre-parse input type.
4. **Context types are explicit.** `LocalToolContext = { db, userId, getActiveResumeId,
   setActiveResumeId, navigateToResume }`. `RemoteToolContext = { userId }`. Every write and
   read tool takes an optional `resumeId` that defaults to the active résumé locally. Remote
   copies require it (or fall back to most recently updated).
5. **Approval and lazy flags live on the definition**, so every surface sees them:
   `needsApproval: true` for destructive writes, `lazy: true` for rarely used tools, with
   `lazyToolsConfig: { includeDescription: "first-sentence" }` in `chat()`.
6. **The `remoteResumeTools` list in `remote-tools.server.ts` is what MCP serves.** Adding a
   remote copy means adding it to that list. Read tools set
   `metadata: { title, annotations: { readOnlyHint: true } }` so MCP hosts skip confirmation.
7. **List and search tools search and page; they never dump.** Returning "the latest 50" fails
   silently (the model cannot tell item 51 exists, so it says "not found" or creates a
   duplicate) and resends every row on every later turn. Every list/search tool spreads
   `searchPageInputShape` (`keyword`, `limit` default 20 / max 50, `offset`) into its input and
   `searchPageOutputShape` (`total`, `nextOffset`, `null` when done) into its output.
   `keyword` is split into words and **every word must match some field** (so
   "senior react remote" finds rows where those words are spread across fields). Both sides
   split with `searchTerms()` and finish with `nextOffset()` from `shared/search-page.ts`, and
   filter, sort and page in the query engine, never on a materialized array. Locally that means
   TanStack DB `queryOnce`: one `.where(orIlike(term, …fields))` per term, then
   `orderBy`/`offset`/`limit`, plus a second `queryOnce` selecting `count()` (see
   `listLocalResumes`). On the server it means one `or(like…)` group per term in Drizzle, plus a
   `count()` query. Exceptions:
   `rank_*` returns top N with no paging; `get_*` by id uses `sections` instead; small fixed
   sets (a résumé's skill groups, statuses) return everything.

**File layout**

```
features/agentic-tools/
  definitions/             # isomorphic toolDefinition()s, one file per domain
    resume-definitions.ts  # list_resumes, get_resume, set_active_resume, setters, upserts…
    job-definitions.ts     # save_job, list_jobs, get_job, attach_job, update_job
    library-definitions.ts # search_library, attach_library_items, rank_*
    tool-context.ts        # LocalToolContext / RemoteToolContext (type-only)
  shared/                  # pure isomorphic logic used by client and server implementations
    resume-view.ts         # ResumeDetail + job -> get_resume output (with ids)
    job-view.ts
    rank.ts                # keyword/skill overlap scoring
  resume-tool-schemas.ts   # Zod schemas (unchanged role)
  resume-tools.server.ts   # remote implementations: plain (ctx, input) functions over Drizzle
  remote-tools.server.ts   # def.server<RemoteToolContext>() list built from those functions
  resume-mcp.server.ts     # createMCPServer({ tools: remoteResumeTools })
  resume-orpc-router.server.ts
routes/_dashboard/-ai/-utils/
  client-tools.ts          # def.client<LocalToolContext>() over TanStack DB
  local-*-tools.ts         # local implementations (existing)
```

**MCP hosting (done).** Upgraded to `@tanstack/ai` 0.67, `ai-client` 0.39, `ai-react` 0.30,
`ai-openrouter` 0.21, and added `@tanstack/ai-mcp` 0.8.2 (which brings the v2 MCP SDK).
`@modelcontextprotocol/sdk` v1 is removed. The three existing remote tools now go through
`definitions/` → `remote-tools.server.ts` → `createMCPServer`, covered by
`resume-mcp.server.test.ts`. The server is stateless (spec 2025 `sessions: "stateless"`
default), which matches the old per-request transport.

### Tool surface matrix

| Tool                                            | Client (local, chat) | Remote (Drizzle: MCP + oRPC)          |
| ----------------------------------------------- | -------------------- | ------------------------------------- |
| `list_resumes`                                  | yes                  | yes (exists)                          |
| `get_resume`                                    | yes                  | yes (replaces `get_resume_document`)  |
| `search_library`                                | yes                  | yes (replaces `search_resume_blocks`) |
| `list_jobs` / `get_job`                         | yes                  | yes (new)                             |
| `rank_resumes_for_job` / `rank_library_for_job` | yes                  | yes (shared scorer)                   |
| `get_playbook`                                  | yes (lazy)           | yes (static text)                     |
| `set_active_resume` / `open_resume`             | yes                  | no (UI state)                         |
| All writes (listed below)                       | yes                  | no (would bypass the event log)       |

Writes: the setters, the `upsert_*` tools, `remove_from_resume`, `reorder_section`, `attach_*`,
`save_job`, `update_job`, `clone_resume`, `create_resume`, `replace_resume_document`,
`tailor_resume_for_job`, and `undo_last_ai_change`.

## Why the assistant keeps creating a new résumé instead of editing this one

1. **The prompt tells it to.** `DEFAULT_EVENT_SOURCED_SYSTEM_PROMPT` says _"Prefer
   clone_current_resume before creating a tailored variant so the original resume remains
   intact."_ Every "tailor this" request reads as a variant request.
2. **Editing in place is the most expensive path.** The only in-place write is
   `update_current_resume_document`, which needs `get_current_resume_document` first and then the
   _entire_ `ResumeDocumentV1` echoed back. Large payloads fail schema validation or get truncated,
   so models fall back to `clone_current_resume` (tiny input) or `create_resume_from_document`.
3. **"Current" never moves.** `context.resumeId` is pinned to the page the chat opened on. After a
   clone, every `*_current_*` tool still edits the original, so "clone then edit" cannot be chained;
   the model works around it by building a whole new document with `create_resume_from_document`.
4. **No granular write tools.** There is no "set summary", "rewrite these bullets", "add skill"…
   even though `ResumeWorkspaceAdapter` already has all of them (`updateSummary`,
   `updateExperienceBullets`, `updateSkillGroups`, `createExperience`, `attachLibraryRows`, …).
5. **Turns run out.** `chat()` is called without `agentLoopStrategy`, so TanStack AI's default
   `maxIterations(5)` applies. Any chain longer than ~4 tool calls is cut off mid-task.

## Existing in-app tools

| Tool                             | What it does today                                                                                                  | Problem after normalization                                                                                                                                                                                                                 | Verdict     | Recommendation                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_current_resume_document`    | Returns the full `ResumeDocumentV1` plus `jobDescription` for the page's résumé.                                    | No row ids in the document, so the model cannot target a single experience/bullet afterwards. Returns flattened `jobDescription` string, not the linked `job` (id, company, title). Only ever the page's résumé.                            | **Replace** | `get_resume({ resumeId?, sections? })`: optional target id, optional section filter to keep payloads small, includes library ids per item and `job: { id, company, title, status } \| null`.      |
| `search_current_resume_blocks`   | Keyword search over the page résumé's summary, experiences, bullets, projects, skills.                              | Only searches what is already on this résumé, which defeats the shared library: the useful case is finding rows _not yet_ on it. Missing education, talks, certifications, languages, volunteer.                                            | **Replace** | `search_library({ query, sections?, resumeId?, limit })` over all library rows, each hit flagged `onResume: boolean`. Pairs with `attach_library_items`.                                          |
| `clone_current_resume`           | Clones the page résumé (one row + copied layout). Optional `jobDescription` creates/reuses a job and links it.      | Fine mechanically, but returns only `{ resumeId, name }` and the chat keeps targeting the original. `jobDescription` input duplicates `save_job` and can silently create a second job row.                                                  | **Fix**     | `clone_resume({ sourceResumeId?, name?, jobId?, makeActive = true })`. Take `jobId` instead of raw text; switch the chat's active résumé to the clone so follow-up edits land on it.              |
| `create_resume_from_document`    | Inserts a résumé, links a job from `jobDescription`, then `replaceDocument`s a full document into it.               | Forces the model to author an entire document (huge output, invents structure). With a shared library almost every "new résumé" is better done as clone + edit or blank + attach library items.                                             | **Fix**     | Keep for "import from pasted résumé text" only. Rename `create_resume`, accept `jobId`, allow an optional/partial document (blank résumé when omitted), `needsApproval: false`, add `makeActive`. |
| `update_current_resume_document` | Replaces the page résumé's whole document via `workspace.replaceDocument`.                                          | Whole-document round trip for one-line changes; the main cause of failures and of the "make a new one instead" behaviour. Rewrites every section, so a small model error wipes content.                                                     | **Fix**     | Keep as `replace_resume_document({ resumeId?, document })` for bulk rewrites only, mark `needsApproval: true`, and steer the prompt to granular tools first.                                      |
| `refresh_resume_preview`         | Returns `{ refreshed: true }`; does nothing.                                                                        | Writes go straight into TanStack DB collections and live queries re-render on their own. Pure wasted turn (and the prompt _requires_ it after every write).                                                                                 | **Remove**  | Delete the tool and the prompt rule.                                                                                                                                                              |
| `navigate_to_resume`             | Router navigation to a résumé tab.                                                                                  | Chat thread is keyed `event-sourced-resume-ai:${resumeId}`, so navigating to a clone opens an empty chat and the conversation is lost. Schema allows `prompt`/`ai` tabs that `asWorkbenchTab` silently maps to `edit`.                      | **Fix**     | Rename `open_resume`. Carry the thread across (key threads by conversation, not résumé, or hand the transcript over). Restrict `tab` to real tabs.                                                |
| `save_job`                       | Upserts a job (dedupe by identical description or company+title) and **attaches it to the page résumé by default**. | Default attach is wrong for the target flow (job should go on the clone). Dedupe on exact description misses re-pastes with whitespace changes (the UI's `attachJobDescription` already normalizes). Output lacks full fields for chaining. | **Fix**     | `attachToResumeId?: string` instead of `attachToCurrentResume` (default: no attach). Reuse `normalizeJobDescription` matching from `job-rows.ts`. Return the full job row.                        |
| `list_jobs`                      | Keyword/status filter over jobs, newest first, 240-char preview.                                                    | OK. Duplicates `searchJobs` in `job-rows.ts` with slightly different fields (`notes`, `searchableText`).                                                                                                                                    | **Keep**    | Call `searchJobs` so UI and AI rank the same way. Add `linkedResumeIds` per job.                                                                                                                  |
| `attach_job_to_current_resume`   | Links a job to the page résumé.                                                                                     | Can only target the page résumé. Calls `attachJobToResume` _before_ checking the job exists, so a bad id still writes `jobId`.                                                                                                              | **Fix**     | `attach_job({ resumeId?, jobId \| null })`; validate first; `null` detaches.                                                                                                                      |

## Server tools (MCP / oRPC)

| Tool                   | Status                                                               | Verdict  | Recommendation                                                                                                             |
| ---------------------- | -------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `list_resumes`         | Works; keyword search now joins `job` (description, company, title). | **Keep** | Add `jobId` / job label to each row.                                                                                       |
| `get_resume_document`  | Assembles from `layout`; output still has `jobDescription` string.   | **Fix**  | Share the new `get_resume` output shape (`job` object, item ids) so external agents and the in-app assistant agree.        |
| `search_resume_blocks` | Searches blocks per résumé.                                          | **Fix**  | Align with `search_library` (library-wide, `onResume` flags, all section types).                                           |
| _(missing)_            | No job tools for external agents.                                    | **Add**  | `list_jobs`, `get_job` (read-only). Writes stay client-side because server writes would bypass the event log (see README). |
| _(missing)_            | No ranking for external agents.                                      | **Add**  | `rank_resumes_for_job`, `rank_library_for_job` remote copies using the shared scorer in `shared/rank.ts`.                  |
| _(wiring)_             | Each MCP tool and oRPC procedure is hand-registered.                 | **Fix**  | Register from the shared definitions (`metadata.surfaces`) through one generic MCP adapter and procedure factory.          |

## Wiring and infrastructure

| Area                                          | Finding                                                                                                                                                       | Verdict    | Recommendation                                                                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent loop (`stream-resume-chat.server.ts`)   | No `agentLoopStrategy`; default `maxIterations(5)`.                                                                                                           | **Fix**    | `agentLoopStrategy: maxIterations(16)` (or `combineStrategies` with a stop on finish). The JD → tailored-résumé chain below needs ~6–9 calls.                                            |
| Active résumé (`EventSourcedResumeAiContext`) | `resumeId` is a fixed string captured per render.                                                                                                             | **Fix**    | Hold an `activeResumeId` ref in the context; `clone_resume` / `create_resume` / `set_active_resume` update it; all tools default to it. Show the active résumé as a chip in the chat UI. |
| Job context in the prompt                     | Page passes `jobDescription` through `forwardedProps`; it is a snapshot from page load and goes stale after `save_job`. Full JD text is resent every request. | **Fix**    | Send `activeResumeId` + linked job id/label only; the model calls `get_job` when it needs the text.                                                                                      |
| Chat thread key                               | `event-sourced-resume-ai:${resumeId}`.                                                                                                                        | **Fix**    | Thread per conversation (with the résumé as context), so cloning/navigating keeps history.                                                                                               |
| Destructive tools                             | No approvals anywhere.                                                                                                                                        | **Add**    | `needsApproval: true` on `replace_resume_document`, `remove_from_resume` when it would empty a section, and any delete. TanStack AI supports this per definition.                        |
| Tool count / prompt size                      | All tools are always sent.                                                                                                                                    | **Add**    | Mark rarely used tools `lazy: true` (TanStack AI lazy-tool catalog) so the base request stays small as the toolset grows.                                                                |
| Dead schemas (`resume-tool-schemas.ts`)       | `addExperienceBullet*`, `replaceExperienceBullets*`, `cloneResumeToolInputSchema`, `updateResumeDocumentToolInputSchema` are unused.                          | **Remove** | Delete, or reuse for the new granular tools below.                                                                                                                                       |
| Type casts in `buildTextAdapter` / `chat()`   | `as never`, `as unknown as AnyTextAdapter` (against repo rules).                                                                                              | **Fix**    | Type the model id against `OpenRouterModel`; drop casts.                                                                                                                                 |
| `features/agentic-tools/README.md`            | Lists tools that no longer match (no `attach_job_to_current_resume`, still mentions preview refresh flow).                                                    | **Fix**    | Update after the tool changes land.                                                                                                                                                      |

## New tools needed

All write tools take an optional `resumeId` that defaults to the chat's **active** résumé and
return the ids they touched, so calls chain without re-reading the document.

| Tool                                                                        | Purpose                                                                                                                                                      | Built on (already exists)                                                | Priority |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | -------- |
| `list_resumes`                                                              | Local list with name, headline, linked job label, updatedAt. Needed to pick a base résumé.                                                                   | `db.collections.resume`, `jobListLabel`                                  | P0       |
| `set_active_resume`                                                         | Point subsequent tool calls at another résumé without navigating.                                                                                            | context ref                                                              | P0       |
| `update_resume_details`                                                     | Name, fullName, headline, description, template.                                                                                                             | `workspace.updateMetadata`                                               | P0       |
| `set_summary`                                                               | Replace the professional summary.                                                                                                                            | `workspace.updateSummary`                                                | P0       |
| `set_experience_bullets`                                                    | Rewrite one experience's bullets on this résumé (reuses library bullets by text).                                                                            | `workspace.updateExperienceBullets`                                      | P0       |
| `upsert_experience` / `upsert_project` / `upsert_education` / `upsert_talk` | Create (no `id`) or edit (with `id`) one item; typed per section so models get tight schemas.                                                                | `workspace.create*` / `update*`                                          | P0       |
| `set_skills`                                                                | Replace skill groups (names resolved to shared skill rows).                                                                                                  | `workspace.updateSkillGroups`                                            | P0       |
| `remove_from_resume`                                                        | Remove an item from this résumé's layout (library row stays).                                                                                                | `workspace.delete*` (layout removal)                                     | P0       |
| `reorder_section`                                                           | Set the order of a section by id list.                                                                                                                       | `setEntities` on layout                                                  | P1       |
| `attach_library_items`                                                      | Put existing library rows (found via `search_library`) on the résumé.                                                                                        | `workspace.attachLibraryRows`                                            | P0       |
| `set_contacts` / `set_links` / `set_notes`                                  | Header contacts, links, cover-letter notes.                                                                                                                  | `workspace.updateContacts` / `updateLinks` / `updateNotes`               | P1       |
| `get_job`                                                                   | Full job row including description.                                                                                                                          | `db.collections.job.get`                                                 | P0       |
| `update_job`                                                                | Status, notes, fields after parsing.                                                                                                                         | `updateJob`                                                              | P1       |
| `rank_resumes_for_job`                                                      | Deterministic score of each résumé against a job (keyword/skill overlap), returns top N with matched terms. Picks the "compatible résumé".                   | résumé `searchableText`, skills, bullets; job description                | P0       |
| `rank_library_for_job`                                                      | Same scoring over library bullets/projects/skills, returns the best rows not yet on the résumé.                                                              | `search_library` index                                                   | P1       |
| `tailor_resume_for_job` _(composite)_                                       | One call for the common path: ensure the job is saved, pick a base (given or top-ranked), clone it, link the job, make the clone active, return its outline. | `saveJob` + `rank_resumes_for_job` + `cloneResume` + `attachJobToResume` | P0       |
| `get_playbook` _(lazy)_                                                     | Returns step-by-step instructions for a named workflow (see below) so the base prompt stays short.                                                           | static text                                                              | P1       |
| `undo_last_ai_change`                                                       | Revert the last tool write on a résumé (event log makes this feasible).                                                                                      | sync event log                                                           | P2       |

## Playbooks ("skills") the model needs

TanStack AI has no skills primitive. Ship these as short sections in the system prompt
(or behind `get_playbook` once there are many). Each one says _when_ it applies and the call order.

| Playbook                       | Trigger                                                      | Chain                                                                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Edit this résumé (default)** | Any change request without "new / copy / variant / version". | `get_resume(sections)` → granular setters (`set_summary`, `set_experience_bullets`, `upsert_*`, `set_skills`) on the active résumé. Never clone.                                                                                                                         |
| **Pasted job description**     | Message contains a job posting.                              | Parse fields yourself → `save_job` (no attach) → if the active résumé has no job or the same job: `attach_job` and continue with _Edit this résumé_; otherwise `tailor_resume_for_job({ jobId })` → `get_resume(sections)` → setters → `open_resume`. Target: ≤ 8 calls. |
| **Make a tailored copy**       | User explicitly asks for a new/copy/variant.                 | `tailor_resume_for_job({ jobId?, baseResumeId: active })` → setters → `open_resume`.                                                                                                                                                                                     |
| **Fill gaps from my library**  | "Add my X project", "use the bullet about Y".                | `search_library` / `rank_library_for_job` → `attach_library_items` → optional `set_experience_bullets`.                                                                                                                                                                  |
| **Import résumé text**         | User pastes a whole résumé.                                  | `create_resume` with the parsed document → `open_resume`.                                                                                                                                                                                                                |

Prompt rules to replace the current ones: remove "prefer clone" and "call refresh_resume_preview";
add "edit the active résumé unless the user asks for a copy"; "use granular tools, use
`replace_resume_document` only for full rewrites"; "after a clone the clone is active".

## Implementation batches (5 at a time)

Each batch also updates the system prompt for the tools it adds or removes, and ships with unit
tests for any shared (isomorphic) logic. Tick items off as they land.

### Batch 1: Foundation and reads

- [ ] **Shared definition layout.** `definitions/`, `tool-context.ts` and `remote-tools.server.ts`
      exist with the three remote tools. Still to do: move the chat definitions from
      `resume-chat-tool-definitions.ts` into `definitions/`, add `LocalToolContext`, create
      `shared/`.
- [ ] **Cleanup.** Delete `refresh_resume_preview` (tool + prompt rule) and dead schemas. Add
      `agentLoopStrategy: maxIterations(16)` to `chat()`.
- [ ] **Active résumé.** `activeResumeId` ref in `LocalToolContext`, plus `set_active_resume`.
      All tools default to it.
- [x] **`list_resumes`.** One definition, client (`listLocalResumes`) + remote implementation,
      shared search/paging (rule 7), `jobId` + `jobLabel` per row. In the chat tool list.
- [ ] **`get_resume({ resumeId?, sections? })`.** Shared `resume-view.ts` with item ids and a
      `job` object. Replaces `get_current_resume_document` (chat) and `get_resume_document`
      (MCP/oRPC).

### Batch 2: Granular writes (client only)

- [ ] `update_resume_details`
- [ ] `set_summary`
- [ ] `set_experience_bullets`
- [ ] `set_skills`
- [ ] `remove_from_resume`

Prompt: "edit the active résumé unless the user asks for a copy", "use granular tools first".
Remove "prefer clone".

### Batch 3: Item upserts and bulk replace (client only)

- [ ] `upsert_experience`
- [ ] `upsert_project`
- [ ] `upsert_education`
- [ ] `upsert_talk`
- [ ] `replace_resume_document` (rename of `update_current_resume_document`, `needsApproval: true`)

### Batch 4: Jobs

- [ ] `save_job` fix (`attachToResumeId`, normalized dedupe, full row output)
- [ ] `attach_job({ resumeId?, jobId | null })` (validate first, `null` detaches)
- [ ] `get_job` (client + remote)
- [ ] `list_jobs` with rule 7 search/paging (local `queryOnce` like `listLocalResumes`, replacing
      the `.toArray` filter; also swap `.toArray.find` by id for `.get`), with `linkedResumeIds`
      (client + remote)
- [ ] `update_job`

Also: send only `activeResumeId` + job id/label in the prompt instead of the full JD text.

### Batch 5: Résumé lifecycle and the JD flow

- [ ] `clone_resume` (`jobId`, `makeActive`)
- [ ] `create_resume` (optional partial document, `makeActive`)
- [ ] `open_resume`, with the chat thread surviving navigation (thread keyed per conversation)
- [ ] `rank_resumes_for_job` (shared `rank.ts`, client + remote)
- [ ] `tailor_resume_for_job` (composite)

### Batch 6: Library

- [ ] `search_library` (client + remote, replaces both block-search tools, rule 7 search/paging)
- [ ] `attach_library_items`
- [ ] `rank_library_for_job` (client + remote)
- [ ] `reorder_section`
- [ ] `set_contacts` / `set_links` / `set_notes`

### Batch 7: Hardening

- [ ] Approval UI for `needsApproval` tools (bound `interrupts` / `resolveInterrupt`)
- [ ] `lazy: true` on rare tools + `lazyToolsConfig`, and `get_playbook`
- [ ] Remove casts in `buildTextAdapter` / `chat()`
- [x] Adopt `@tanstack/ai-mcp` `createMCPServer` (done ahead of Batch 1, see "MCP hosting")
- [ ] README refresh, and `undo_last_ai_change` (P2)
