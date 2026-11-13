# Page assistant

One assistant for the dashboard. It knows the route and the row on screen, opens as the sparkles bubble, and can grow into a sheet on the same page. Each route gets its own conversation. The model only sees that conversation. A search tool reaches the others. Library pages share two data tools instead of a tool per collection.

The résumé editor AI tab stays. It already has the write tools, the preview, and its own thread per résumé (`event-sourced-resume-ai:${resumeId}`). This plan does not fold that tab into the bubble.

---

## What is wrong today

Three chats, and none of them is the one we want on a random page.

| Surface              | Where                                             | Thread                                                                     | Tools                                                                           | Problem                                                                                                                                                                          |
| -------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Floating bubble      | `DashboardAssistant` in `_dashboard/layout.tsx`   | One key for the whole app: `dashboard-assistant:${userId}` in localStorage | Dashboard pack only (list/get résumés and jobs, stats, profile, start a résumé) | Same transcript follows the user from jobs to notes to certifications. The prompt never hears the URL or the open row. Hidden on `/dashboard`, `/dev`, and `/resumes/$resumeId`. |
| Experience dock      | `ExperienceAiPanel` on the experience detail page | `experience-ai:${groupKey}`                                                | Six experience-bullet tools, scoped to the open group                           | The interaction people like (sparkles, sticky dock, suggestion chips). It is a second assistant on a page that already has the bubble.                                           |
| Dashboard home sheet | `DashboardChat` on `/dashboard`                   | `dashboard-chat:local`, no persistence                                     | None                                                                            | A third chat. The bubble is hidden on this page so the sheet can exist.                                                                                                          |

The bubble face is `AssistantFace` (`AssistantFace.tsx`). The icon to keep is Lucide `Sparkles`, the one on the experience dock (`ExperienceAiPanel.tsx`).

Context compaction (`ContextCompactionNotice`, `reduceContextCompaction`) only shrinks one long thread. It does not stop every page from appending into that one thread.

---

## Target

```text
Sparkles bubble (every dashboard page except the résumé editor and /dev)
  └─ compact panel (today's card, no enter animation)
       ├─ empty state: what this page is + 2–4 suggested actions
       ├─ header: New, History, Expand
       └─ Expand → same chat instance, sheet over the page content
            no route change, no remount, no slide/zoom
```

- Opening the bubble on a route with no thread starts a new conversation for that route.
- Coming back to a route reopens the newest conversation for that route. It does not resume a conversation from another page.
- New starts another conversation for the current route and leaves the old one in History.
- History lists recent conversations (title, route label, relative time). Picking one loads that transcript in place, including a conversation that started on another route, so the user can cross-reference. The prompt says which page the conversation started on and which page is open now.
- The request to the model contains only the active conversation's messages, plus a short page block and a short "other conversations exist" hint. Older threads are not concatenated.
- `search_conversations` reads the index and can pull a bounded excerpt from another thread when the user asks.
- Writes still go through the local TanStack DB collections, so they sync as events. The résumé editor is still the only place that edits a résumé document.

---

## 1. Shell

- [ ] Replace `AssistantFace` with Lucide `Sparkles`. Keep the experience dock's glow on the bubble (`border-primary/35`, primary ring, pulse while a reply is running). Drop `AssistantFace.tsx` once nothing imports it.
- [ ] Show the bubble on `/dashboard`. Remove `DashboardChat`, `routes/api/ai/dashboard-chat.ts`, and `stream-dashboard-simple-chat.server.ts` after the home page uses the bubble.
- [ ] Keep the bubble hidden on `/resumes/$resumeId` (and its events route) and on `/dev`. The editor tab and the chat lab stay as they are.
- [ ] Delete the experience dock: `ExperienceAiPanel`, `use-experience-ai.ts`, `experience-ai-chat-ui`, `routes/api/ai/experience-agent.ts`, `stream-experience-chat.server.ts`. Move the three suggestion prompts and the experience system-prompt rules into the page registry (section 3) and the experience tool pack (section 6). Keep `experience-ai-tools.ts` until that pack calls it.
- [ ] Two sizes of the same mounted chat, switched by local state (`dock` | `sheet`):
  - `dock`: the current fixed card (`data-test="dashboard-assistant-panel"`). Remove the `animate-in` / `zoom-in` / `slide-in` classes. Open and close are instant.
  - `sheet`: a right-hand sheet from `components/ui/sheet.tsx` that covers the main column and leaves the sidebar in place. Disable the sheet's open/close animation (`duration-0`, no slide). The chat hook is not inside the sheet, so expanding does not remount `useChat` or reset scroll state more than a layout change requires.
  - Expand and collapse are header buttons (`data-test="dashboard-assistant-expand"`, `dashboard-assistant-collapse`). The bubble still toggles the dock closed.
- [ ] Header copy comes from the page registry ("Experience · Acme, 2022–2024", "Job · Senior Engineer") instead of the fixed "Résumés, jobs and applications".
- [ ] Empty thread shows the registry's suggestion chips (`data-test="dashboard-assistant-suggestion"`). Chips send their prompt into the current thread. They disappear once the thread has a user message.
- [ ] `data-test="dashboard-assistant-new"` and `data-test="dashboard-assistant-history"`.

Browser check when this lands: bubble on a job, an experience, the dashboard home, and a list page; absent on a résumé and on `/dev`; expand and collapse keep the same messages; no route change in the URL.

---

## 2. Conversations

Today `useDashboardAssistantChat` pins one `threadId` and one localStorage key for the signed-in user. Replace that with an index plus one record per conversation.

Store it in localStorage first, same adapter as `createLocalChatPersistence`. Chat is already local-only for résumé threads (`resumeAiConversation` / `resumeAiMessage` are `localOnly: true`). A new synced collection is out of scope. Shape:

```ts
type AssistantConversation = {
  id: string;
  routeKey: string; // see below
  routeLabel: string; // "Experience · Acme"
  title: string; // first user message, trimmed, or the route label
  createdAt: number;
  updatedAt: number;
  messageCount: number;
};

// localStorage keys
// assistant-conversations:${userId}            → AssistantConversation[]
// assistant-conversation:${userId}:${id}       → ChatPersistedState
```

Route key, from the router match (not the raw pathname string alone):

- `routeId` from the matched route (`/experiences/$experienceId`, `/jobs/$jobId`, `/jobs`, `/notes`, …).
- Plus the dynamic params that identify the row or group (`experienceId`, `jobId`, `coverLetterId`, `skillId`). Omit search and hash so filters do not spawn threads.
- Experience detail uses the existing company+period `groupKey` when the page has one, because several title rows share one screen. Fall back to `experienceId` until the group key is in the registry.

Behaviour:

- [ ] On navigation, if the active conversation's `routeKey` differs from the next route, switch to the newest conversation for the next `routeKey`, or create one when none exists. Do this even when the panel is closed, so the first open is already the right thread. A reply that is still streaming keeps its thread until the run settles, then the switch happens. The bubble can keep the working dot while that run finishes.
- [ ] New creates a conversation for the current `routeKey`, makes it active, and leaves the previous one in the index.
- [ ] History is the index sorted by `updatedAt`, newest first. Selecting an item sets it active without changing the route. A row shows the route label, title, and relative time. The active row is marked.
- [ ] Clear (today's trash button) deletes the active conversation's messages and drops it from the index, then starts a fresh one for the route. It does not wipe other routes.
- [ ] `useChat` `threadId` is `assistant:${conversationId}`. Persistence `getKey()` reads the active id. Only that record is passed as `messages`.
- [ ] Title: set from the first user message (about 80 characters) when the conversation is still untitled.
- [ ] Cap the index at 50 conversations per user. When a 51st is created, drop the least recently updated. Say so nowhere unless a search later misses it. Compaction inside one thread stays as it is.

`forwardedProps` gains `conversationId` so the server log can tell threads apart. The server still does not store the transcript.

---

## 3. Page context

A registry next to the assistant, `routes/_dashboard/-ai/-utils/page-context.ts`. Each entry:

```ts
type PageContext = {
  routeId: string;
  label: string; // "Jobs", "Experience"
  summary: string; // one sentence for the system prompt
  suggestions: { label: string; prompt: string }[];
  toolPack: "library" | "experience" | "job" | "resume-list" | "cover-letter" | "none";
  focus: {
    param?: string; // "jobId" | "experienceId" | "coverLetterId" | "skillId"
    collection?: AssistantCollection;
  };
};
```

The hook reads `useRouterState` (route id, params, pathname) and resolves one entry. Unknown routes get a fallback: label from the pathname, no suggestions, tool pack `library`, no focus row.

Each request already sends `forwardedProps` (`today`, model, skills). Add:

```ts
page: {
  routeId: string;
  pathname: string;
  label: string;
  summary: string;
  params: Record<string, string>;
  focus: { collection: string; id: string; title: string } | null;
  conversationStartedOn: string; // route label stored on the conversation
}
```

`buildDashboardSystemPrompt` appends a page block built from that object. The block is part of the system prompt, not a fake user message, so it refreshes when the user switches history onto another page. Include the focus row's id and a one-line title (job title + company, experience role + dates, cover letter title). The client loads that line from the local collection before send. Do not paste the whole row into the prompt. The model calls `query_collection` when it needs fields.

Experience detail also sends the existing group snapshot (`formatExperienceSnapshot` / `limitExperienceSnapshot`) inside the page block, because those tools are useless without the ids. That snapshot already has a size limit. Other pages do not get a snapshot.

Suggested actions to seed (prompts, not new tools):

| Route                                                                                                                        | Chips                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Experience detail                                                                                                            | Condense all titles, Trim weak bullets, Merge duplicates (the three strings in `ExperienceAiPanel`) |
| Job detail                                                                                                                   | Summarize this posting, Find a résumé for this job, Draft what to tailor                            |
| Jobs list                                                                                                                    | How is the search going, Which applications are stuck                                               |
| Résumés list                                                                                                                 | Which résumé fits a job I paste, Compare my recent résumés                                          |
| Cover letter detail                                                                                                          | Tighten this letter, Match it to the job                                                            |
| Library lists (notes, languages, certifications, volunteers, education, talks, projects, summaries, skills, contacts, links) | Summarize what I have here, Find weak or duplicate entries                                          |
| Dashboard home                                                                                                               | Paste a job and pick a résumé (today's dashboard job)                                               |
| Assistant skill                                                                                                              | Explain this skill, Find where it would change a bullet                                             |
| Settings, account, admin                                                                                                     | No chips. Tool pack `none`. Read-only answers, no writes.                                           |

- [ ] Registry covers every `_dashboard` route the bubble can appear on. A unit test lists route files and fails when a new page has no entry and no explicit fallback.
- [ ] Prompt test: the page block contains the route label, the focus id, and the line that says the model must call a tool before claiming a field value.
- [ ] Experience suggestions render on an empty experience thread and are gone after a send.

---

## 4. Tools

Decision: a god tool for ordinary rows, plus a small pack where a workflow already exists. Do not register the résumé editor's tool list on the bubble, and do not add one tool per collection.

The résumé editor keeps `client-tools.ts` (layout edits, `set_experience_bullets`, `replace_resume_document`, playbooks, undo, handoff). Those tools assume an active résumé and a document. Putting them on every page would spend the context window and let a notes-page chat rewrite a résumé by accident.

### 4.1 Shared data tools

Two tools, allowlisted collections, lazy so the model sees the name and the first sentence until it needs the schema.

Allowlist (the `db.collections` keys the user edits by hand):

`resumeExperience`, `resumeExperienceBullet`, `resumeEducation`, `resumeEducationBullet`, `resumeSkillGroup`, `resumeSkill`, `resumeContact`, `resumeProject`, `resumeSummary`, `resumeNote`, `resumeLink`, `resumeLanguage`, `resumeCertification`, `resumeVolunteer`, `resumeTalk`, `savedProject`, `job`, `coverLetter`, `applicationAnswer`, `assistantSkill`.

Never: `resume` (the document and layout), `settings`, `resumeAiChat`, `resumeAiConversation`, `resumeAiMessage`, sync/outbox tables. Résumé document edits stay in the editor. Settings stay in the settings form.

`query_collection`

- Input: `collection`, optional `id`, optional `keyword`, `limit` (default 20, max 20), `offset`.
- `id` returns that row or a not-found error.
- Without `id`, filter to the signed-in user's rows, apply `keyword` with the same `searchTerms()` idea as `search_library` against the collection's text fields (role, company, title, name, body, bullet text — a small per-collection field list, not every column), sort by `updatedAt` when the row has it, and return `items`, `total`, `nextOffset`.
- Output rows are a trimmed view: id plus the fields a person would read. Omit `userId` and sync metadata.
- Read-only. No approval.

`mutate_collection`

- Input: `collection`, `op` (`insert` | `update` | `delete`), `id` for update and delete, `values` for insert and update.
- `values` is a strict object per collection, derived from the Zod row schema in `schemas.ts` with `id`, `userId`, `createdAt`, and `updatedAt` stripped. The tool fills ids and timestamps the way the pages already do (`newId`, `nowMs`). Unknown keys fail the call.
- Update replaces only the provided keys. It does not accept a full-row overwrite, so a partial patch cannot wipe a column the model left out.
- `needsApproval: true` on every op. The approval card names the collection, the op, and the row title.
- Experience bullets are not in this tool. Condensing has ordering rules (`sortOrder`, reuse across titles, stay inside the group). Those stay on the experience pack. The allowlist for `mutate_collection` excludes `resumeExperienceBullet`. Query can still read bullets.
- `resume` stays excluded. A chat that needs a résumé edit calls the existing `start_resume_for_job` handoff (job pack) and the editor continues.
- Deletes go through `deleteWithReferences` where that helper already knows the row, so bullet children do not get orphaned. Collections it does not cover delete the single row only when the row has no children; otherwise the tool returns an error telling the model to delete children first.

`describe_collection` is not a third tool. The mutate schema is the description. Keep it `lazy: true` so a notes question does not load the job schema.

### 4.2 Page packs

The client passes `tools` from the active pack. The server `chat()` call receives the same definitions (schemas only, client implementations), which is how the dashboard route already works. Switching packs mid-thread is allowed because TanStack tools are per request. A history conversation opened on a new page gets the new page's pack, not the pack from the day it started. The system prompt says which pack is live.

| Pack           | When                                                         | Tools                                                                                                                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `library`      | Lists and detail pages that are plain rows, and the fallback | `query_collection`, `mutate_collection`, `search_conversations`                                                                                                                                                                                                                           |
| `experience`   | Experience detail                                            | Library tools plus the six existing experience tools (`list_experience_titles`, `list_experience_bullets`, `update_experience_bullet`, `move_experience_bullet`, `delete_experience_bullet`, `set_experience_title_bullets`). Context still refuses ids outside the open group.           |
| `job`          | Job detail and the jobs list                                 | Library tools plus the current dashboard job tools that are real workflows: `save_job`, `list_jobs`, `get_job`, `rank_resumes_for_job`, `quote_pay_rate`, `start_resume_for_job`, `get_application_stats`. `start_resume_for_job` stays approval-gated and still hands off to the editor. |
| `resume-list`  | `/resumes` and `/dashboard`                                  | Job pack plus `list_resumes`, `get_resume`, `search_library`, `get_profile_overview`, `search_application_answers`, `list_cover_letters`, `get_cover_letter`. No résumé write tools.                                                                                                      |
| `cover-letter` | Cover letter detail                                          | Library tools plus `get_cover_letter` and `get_job` so a rewrite can see the posting. Saving the letter is `mutate_collection` on `coverLetter`.                                                                                                                                          |
| `none`         | Settings, account, admin                                     | `search_conversations` only.                                                                                                                                                                                                                                                              |

`get_playbook` stays on the résumé editor. The bubble does not grow a second copy of those playbooks. Experience condensing instructions live in the experience page block (moved from `EXPERIENCE_AGENT_RULES`).

- [ ] Schemas in `features/agentic-tools/` (`assistant-data-tool-schemas.ts`, definitions next to `dashboard-definitions.ts`). Client implementations in `routes/_dashboard/-ai/-utils/local-collection-tools.ts`.
- [ ] Tests: query pages and filters; query by id; mutate rejects `resume`, `settings`, and `resumeExperienceBullet`; mutate update patches one field and leaves the others; delete of a parent with children returns the error; experience tools still reject an id outside the group; approval flag is set on mutate.
- [ ] README paragraph in `features/agentic-tools/README.md` updated when the tools land. `todos/ai-chat.md` stays the editor-chat list. This file is the bubble list.

### 4.3 History tool

`search_conversations`

- Input: optional `keyword`, optional `routeKey`, `limit` (max 10).
- Reads the localStorage index (section 2), not the active `useChat` messages.
- Returns `id`, `title`, `routeLabel`, `routeKey`, `updatedAt`, and a short preview (first user message, or the keyword hit trimmed to ~240 characters). It does not return full transcripts in the list.
- A second optional flag `conversationId` plus `around` returns up to 12 messages from that one conversation (role + text only, tool payloads dropped). The model uses this when the user asks what they decided last time.
- The active conversation is omitted from results. The model already has it.
- Read-only. The tool cannot switch the user's active thread. Switching is a UI action so a tool call cannot yank the transcript out from under the user.

The system prompt tells the model: you only have this conversation in front of you; call `search_conversations` before claiming what was said on another page.

- [ ] Unit test with three stored conversations: keyword hit, route filter, excerpt cap, active id excluded.
- [ ] The SSE request body for a turn contains only the active thread's messages. Assert in the existing chat test helper or a small test that builds the persistence records and checks what `useChat` would reload for a given id.

---

## 5. Prompt and handoff

- [ ] Rewrite `DASHBOARD_SYSTEM_PROMPT` so it is the shell (local database, do not invent rows, no em dashes, skills, the pre-2023 generative-AI rule) plus "you are on {page}". Move the job-posting steps (save, rank, start résumé) into the `job` and `resume-list` page blocks so a notes page does not carry that procedure.
- [ ] Experience rules move from `experience-system-prompt.ts` into the experience page block, including the condense playbook. Delete the file with the experience route.
- [ ] `start_resume_for_job` handoff (`resume-handoff.ts`) still closes the panel and navigates to `/resumes/$resumeId?tab=ai`. The bubble thread stays in its own history. The editor thread stays per résumé. The handoff message appended today remains the bridge. Do not copy the bubble transcript into the editor thread.
- [ ] Skill instructions stay per surface. Pass `experience` on the experience pack and `dashboard` otherwise, using `useAssistantSkillInstructions`.

---

## 6. Order of work

1. Shell: sparkles, instant dock, sheet expand, bubble on `/dashboard`, experience dock removed, suggestions rendered from a hardcoded experience entry so the page is not worse while the registry is incomplete.
2. Conversation index and per-route threads, including New and History. Migrate the old `dashboard-assistant:${userId}` localStorage blob into one conversation tagged with route key `legacy` so an in-progress chat is not deleted. Do not migrate `experience-ai:*` blobs. Those threads were single-purpose and the page now starts clean. Mention that in the PR.
3. Page registry and the page block in the system prompt, with the route-coverage test.
4. `search_conversations`.
5. `query_collection` and `mutate_collection`, library pack, approval card reuse from `DashboardAssistantToolWidgets`.
6. Experience pack and job / résumé-list packs wired to the routes that already had those tools.
7. Delete the unused routes and hooks listed in section 1. Update `features/agentic-tools/README.md`.

Each step is shippable. Step 1–3 already make the bubble specific to the page. Steps 4–6 are what let it act on the row.

---

## 7. Out of scope

- Merging the résumé editor AI tab into the bubble.
- Server-side storage of assistant transcripts, or syncing them.
- File and image uploads in the composer (`todos/ai-chat.md` section 9).
- Re-enabling the prompt queue (`todos/ai-chat.md` section 2). The bubble keeps `queue: "drop"` until that client bug is fixed.
- A tool that runs arbitrary SQL or accepts a collection name outside the allowlist.
- Editing résumé layout, section order, or PDF content from the bubble.
- Admin table writes. Admin routes use the `none` pack.

---

## 8. Browser checks

- Experience detail: bubble only, sparkles icon, empty state shows the three condense chips, a send stays on the page, expand opens the sheet without a URL change, collapse returns to the dock with the same messages.
- Navigate to a job and back: the experience thread is still in History and is not what the model sees on the job. The job thread starts empty the first time.
- New on a job, then History, then the previous job conversation: composer and messages swap, the page does not navigate.
- Ask about "the other conversation": the reply uses `search_conversations` and does not invent the earlier text. Confirm in the tool card.
- On notes, ask for a duplicate title change: the approval card shows `resumeNote` and a patch of one field. Deny leaves the row. Approve updates the local row.
- On an experience, a condense still uses `set_experience_title_bullets` and refuses a bullet id from another employer.
- Résumé editor: no bubble. Dashboard home: bubble, no second sheet trigger. `/dev`: no bubble.
