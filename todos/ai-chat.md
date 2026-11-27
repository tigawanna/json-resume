# AI assistant & chat

Consolidated from `ai-tools-audit.md`, `chat-prompt-queue.md`,
`prompt-area-migration.md`, `open-router-optimizations.md`, and the AI/composer
items from `next-release.md` and `resume-editor.md`. Dashboard/UI items dropped.

---

## 1. Tooling architecture (reference)

One isomorphic definition per tool, many implementations
(`toolDefinition({ name, description, inputSchema, outputSchema, needsApproval?,
lazy?, metadata? })`):

- `def.client<LocalToolContext>(execute)`: browser implementation over TanStack DB
  collections; registered with `useChat({ tools, context })`. Bare `def` goes to
  `chat({ tools })` on the server so the model knows the schema.
- `def.server<RemoteToolContext>(execute)`: server implementation over Drizzle.
- oRPC procedures use `.input(def.inputSchema).output(def.outputSchema)`.

Rules: writes are client-only (remote copies read-only); reads agents outside the
app need get both implementations with identical output shapes; schemas stay in
`resume-tool-schemas.ts` (top-level must be `z.object`; no `z.preprocess`/`z.coerce`);
context types explicit (`LocalToolContext`, `RemoteToolContext`); approval/lazy
flags live on the definition; list
and search tools search and page, never dump (rule 7: `searchPageInputShape` /
`searchPageOutputShape`, `searchTerms()`, `nextOffset()`).

File layout: `features/agentic-tools/definitions/`, `shared/`,
`resume-tool-schemas.ts`, `resume-tools.server.ts`,
`resume-orpc-router.server.ts`;
`routes/_dashboard/-ai/-utils/client-tools.ts`, `local-*-tools.ts`.

Batches 1-7 are done (foundation/reads, granular writes, item upserts, jobs,
lifecycle + JD flow, library, hardening including approval UI, lazy tools,
`get_playbook`, `undo_last_ai_change`). See the git history /
original audit for the full tool matrix and per-batch notes.

Remaining tooling items:

- [ ] `buildTextAdapter` still casts the model id (approved; `createOpenRouterText`
      only accepts `OPENROUTER_CHAT_MODELS` ids, but the picker offers OpenRouter's
      live list and LM Studio takes any local id). Casts stay with a comment.
- [ ] `features/agentic-tools/README.md` kept in sync with tool surface (done in
      batch 7; re-check on changes).
- [ ] `search_library` does not cover certifications, volunteers or languages yet;
      decide whether to add them or leave out of the attach picker.

---

## 2. Queue prompts while the AI is replying

Status: built then turned off. Resume AI composer disabled while a reply streams;
`useChat` runs with `queue: "drop"`
(`apps/web/src/routes/_dashboard/-ai/-hooks/use-event-sourced-resume-ai.ts`).

Why we cannot use it yet: `@tanstack/ai-client` (0.39.1/0.39.2) loses queued
messages when the reply calls client tools (almost every résumé edit does):
`sendMessage` -> `deliverMessage` takes `deliverClaim` and runs `streamResponse`;
server stops after each batch of client tool calls; nested `streamResponse` in
`finally` calls `drainQueue` while outer `deliverClaim` still held; `isLoading`
false so it `shift()`s the queued message and calls `deliverMessage`, which
returns false because claim held, and `drainQueue` returns without putting the
message back. Plain replies with no tool calls queue fine.

When a new `@tanstack/ai-client` ships, check `drainQueue` / `deliverMessage` in
`dist/esm/chat-client.js`. Fix needs one of:

- `drainQueue` bails while `deliverClaim` held, and `sendMessage` drains after
  `deliverMessage` returns, or
- a failed `deliverMessage` puts the message back at head of queue.

Then re-enable:

- [ ] Remove `queue: "drop"` from `useChat` and `isLoading` guards in `sendText` /
      `resendPastPrompt`.
- [ ] `ResumeAiPromptComposer.tsx`: keep input and send button enabled while busy
      (drop `isBusy` checks in `handleSend`, `disabled`, send button); placeholder
      "Queue a follow-up, it sends when this reply finishes..."; label send button
      "Queue message" while busy.
- [ ] `ResumeAiMessage.tsx`: resend can stay enabled while busy.
- [ ] `resume-ai-chat-ui.tsx`: render `<Queue />` after `<Messages />` in
      `layout`, and add a `queue` widget rendering `item.content` with cancel button
      calling `item.cancelQueued` (`data-test="resume-ai-queued-prompt"`,
      `resume-ai-cancel-queued`).
- [ ] `ResumeAiConversationCard.tsx`: count `chat.queue.length` when deciding if
      conversation empty, and add `chat.queue.length` to scroll effect deps in hook.
- [ ] `features/agentic-tools/README.md`: update composer paragraph.
- [ ] Retest in browser: send an edit prompt (e.g. "tailor a copy for an AI
      Engineer role"), queue a follow-up while tool panels still appear, confirm it
      sends after reply finishes.

---

## 3. Prompt area migration (composer)

Status: integrated. `prompt-area` package installed; registry source vendored at
`apps/web/src/components/prompt-area/`; `ResumeAiPromptComposer.tsx` is live
composer (`ResumeAiComposer.tsx` deleted); controlled segment state lives in
composer; `/commands` wired to `DIRECTIVES`; `@mentions` wired to other resumes;
send serializes inline text + chip display text; empty-state suggestion chips
insert directive chips; `editPastPrompt` uses `PromptAreaHandle` ref; data-test
ids preserved.

Remaining / nice-to-haves:

- [ ] Visual QA in browser: chips legible on dark theme (chip styling, dropdown
      popover).
- [ ] Verify Enter submits, Shift+Enter newlines, undo/redo work.
- [ ] Attachments (files/images): `+` button opens "Reference resumes" sheet and
      inserts `@mention` chip; remaining question: wire prompt-area's `files`/`images`
      strips for real uploads (needs chat API support). (Also tracked under
      composer extras / uploads below.)

Done (keep for context): markdown mode enabled; animated placeholder; command
auto-resolve; `#tags` for resume sections; attach sheet searches/pages 20 rows at
a time with Load more.

---

## 4. Composer polish

- [x] Animated placeholder only while thread is empty; static "Ask for another
      change..." after (`hasMessages` prop).
- [ ] Visual QA on dark theme: chip legibility, `/` and `@` dropdown popovers.
- [ ] Keyboard: Enter sends, Shift+Enter adds a newline, undo/redo work.
- [x] Active résumé chip in composer footer (live name from local DB; turns
      primary when a tool moved it off this page's résumé, with x to switch back).
- [x] `resolveOnSpace` on `/` trigger.
- [x] `markdown` on composer with `normalizeBullets={false}`.
- [x] `#tags` from `SECTION_TAGS` (dropdown only).

---

## 5. Chat markdown rendering

Messages render through `ResumeAiMarkdown.tsx` (`@tanstack/markdown` 0.0.13 +
`@tanstack/highlight`). Done except browser check and bundle trimming.

- [x] Style every element the model sends (h1-h4, p, ul/ol, li, blockquote, hr,
      a opens in new tab, inline code, pre code blocks, strong/em, task lists).
- [x] Theme colours only (DaisyUI/shadcn tokens), light and dark, inside user
      bubble.
- [x] Streaming: half-finished markdown mid-stream shouldn't flash broken layout;
      streaming markdown extension added.
- [ ] Code block highlighting matches app theme (highlighter currently loads every
      language; trim to likely ones if bundle size shows up).
- [ ] Test fixture with every element, checked in browser on both themes.
- [ ] Markdown: bare URLs aren't autolinked (`@tanstack/markdown` 0.0.13 has no
      autolink); revisit when it does, or ask the model for `[text](url)` in prompt.

---

## 6. Attach menu

- [x] Type picker (Résumés, Experiences, Bullets, Education, Projects, Talks,
      Skills, Summaries) with search and back button.
- [x] 20 rows at a time with Load more via `useInfiniteQuery` over
      `listLocalResumes` / `searchLocalLibrary` (offset/limit + count()).
- [x] Rows become `@` chips; already-attached highlighted; library rows on active
      résumé get "On résumé" badge; active résumé disabled.
- [x] On send, one block per type.
- [x] System prompt rule: referenced items are the focus; use their ids directly.
- [x] Typed `@` mentions search the local DB too.
- [ ] Gap to decide: `search_library` doesn't cover certifications, volunteers or
      languages, so they're left out of the picker for now (also in tooling section).

---

## 7. Live preview beside the chat

Done except one nice extra. See `resume-editor.md` for editor-side items.

- [x] Open panel first time a turn calls a résumé write tool (not read tools;
      job tracker writes don't count; writes in history loaded on page open don't
      count).
- [x] Split layout with resizable: chat left, preview right; draft survives; in
      split messages scroll and composer pinned.
- [x] Preview follows chat's active résumé.
- [x] Component preview (shared `ResumeComponentPaper`, zoomed to panel width) instead
      of PDF; Preview tab PDF logic moved into `useResumePdf`.
- [x] Changes tab: line diff of résumé JSON since last message (`+N -M` on tab).
- [ ] Changes: browser-check with a real reply (only empty state checked, to avoid
      spending credits / editing a real résumé).
- [x] Close / minimize to 44px rail / maximize, plus "Preview" button in chat
      header.
- [x] Once closed, don't auto-reopen in same conversation (clearing chat resets).
- [x] Mobile (<1024px): no side panel; "Preview" opens bottom sheet.
- [ ] Nice extra: highlight the section that just changed.
- [x] `data-test` ids on panel and controls.
- [x] Unsaved template picks on page don't reach side preview; pick lives in
      workbench store; side preview uses it while showing page's résumé.

---

## 8. OpenRouter observability

Provider pinning, `requireParameters`, explicit output caps and cached-token
logging already in place (`features/agentic-tools/openrouter-routing.ts`,
`stream-resume-chat.server.ts`).

- [ ] Log which provider served each turn, alongside request id and model config.
- [ ] Response rating (thumbs up/down) tied to that request id, so bad answers can
      be traced to a provider and that provider pinned out.
- [ ] Cost per turn that counts cached input, to compare models/providers on real
      spend.

OpenRouter optimizations (routing quality, pinning, `requireParameters`, output
cap) are done; remaining observability above.

---

## 9. Composer extras (prompt-area migration)

- [ ] File and image uploads through prompt-area's `files` / `images` strips
      (needs chat API support).
- [x] `markdown` prop for live bold/italic/list rendering in composer.
- [x] `resolveOnSpace` so `/tailor ` becomes a chip without opening dropdown.
- [x] `#tags` for section targeting (`#summary`, `#experience`) via
      `hashtagTrigger()`.

---

## 10. Chat message rendering (batch 1)

- [x] Render parts in order; `getMessageBlocks` gone; `MessagePartView` walks
      `message.parts`.
- [x] User bubble stray `text-5xl` class fixed.
- [x] Markdown: external `a` opens in new tab; app links stay in place.
- [x] Markdown: copy button on fenced code blocks (hover/focus).
- [x] Markdown: `em`/`del` keep browser italic/line-through.
- [x] Markdown: streaming partial input (streaming markdown extension).
- [x] Markdown: long URLs and inline code wrap (`wrap-anywhere`); `pre` and tables
      scroll.
- [x] Markdown: test fixture with every element (`ResumeAiMarkdown.test.tsx`).
- [ ] Markdown: bare URLs aren't autolinked (see section 5).
- [x] Markdown: headings, paragraphs, lists, blockquote, hr, inline code, `pre`,
      tables styled; theme class mismatch fixed; per-message `<style>` deduped.
