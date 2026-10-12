# Résumé editor

Every open item that touches the résumé editor (`/resumes/$resumeId`: edit, preview, AI and
events tabs), pulled from the other docs in `todos/` and from code `TODO` comments. Worked
in batches, top to bottom. Tick items here and in the source doc when they land.

Sources:

- [`next-release.md`](./next-release.md) — sections 1, 4, 4b, 5 and features A, D
- [`prompt-area-migration.md`](./prompt-area-migration.md) — remaining composer work
- [`resume-layout.md`](./resume-layout.md) — phase 6 browser checks
- [`event-squash.md`](./event-squash.md) — device squash browser check (events tab)
- [`ai-tools-audit.md`](./ai-tools-audit.md) — active résumé chip (batch 1 leftover)
- `ResumeAiMessage.tsx` — `getMessageBlocks` TODO

Out of scope here (no editor code): production layout rollout, server squash on the real
DB, the squash cron, free/pro plans, OpenRouter observability, and the
`saved-projects.spec.ts` e2e spec.

---

## Batch 1 — Chat message rendering

Files: `ResumeAiTab/ResumeAiMessage.tsx`, `ResumeAiMarkdown.tsx`, `ResumeAiThinkingBlock.tsx`,
`ResumeAiToolPanels.tsx`.

- [x] **Render parts in order** (code TODO). `getMessageBlocks` is gone; `MessagePartView`
      walks `message.parts` in order: text → markdown, each thinking part → its own collapsed
      block, each tool call → one row with its tool-result merged in (errors included), and
      created / cloned / tailored résumés show their card right under the call that made them.
      Orphan tool-results (no call in the message) still render on their own
- [x] User bubble had a stray `text-5xl` class
- [x] Markdown: external `a` opens in a new tab (`target="_blank" rel="noopener noreferrer"`);
      app links stay in place
- [x] Markdown: copy button on fenced code blocks (shows on hover / focus)
- [x] Markdown: `em` / `del` keep the browser's italic / line-through (preflight leaves them)
- [x] Markdown: streaming partial input. Checked `@tanstack/markdown`: an open fence renders as
      code to the end, a dangling `**` stays literal, a half table stays a paragraph. Added
      `streamingMarkdownExtension()` so an empty trailing heading / list item doesn't flash
- [x] Markdown: long URLs and inline code wrap (`wrap-anywhere`); `pre` and tables scroll
- [x] Markdown: test fixture with every element (`ResumeAiMarkdown.test.tsx`)
- [ ] Markdown: bare URLs aren't autolinked (`@tanstack/markdown` 0.0.13 has no autolink);
      revisit when it does, or ask the model for `[text](url)` in the prompt
- [x] Markdown: headings, paragraphs, lists, blockquote, hr, inline code, `pre`, tables styled;
      theme class mismatch (`tm-code` vs `th-code`) fixed; per-message `<style>` deduped

## Batch 2 — Composer polish

Files: `ResumeAiTab/ResumeAiPromptComposer.tsx`, `ResumeAiConversationCard.tsx`,
`-ai/-hooks/use-event-sourced-resume-ai.ts`.

- [x] Animated placeholder only while the thread is empty; "Ask for another change..." after
      (`hasMessages` prop, set by `ResumeAiConversationCard`)
- [x] **Active résumé** chip in the composer footer (live name from the local DB). It turns
      primary when a tool moved it off this page's résumé, with an × to switch back
      (`resetActiveResume` in the hook)
- [x] `resolveOnSpace` on the `/` trigger. Space-resolved chips drop the slash, so `onSelect`
      puts it back in the label and `directiveByCommand` accepts both forms. Unknown
      `/words` still chip but add no instruction
- [x] `markdown` on the composer with `normalizeBullets={false}` (the bubble renders the sent
      text as markdown, where `•` isn't a list marker)
- [x] `#tags` from `SECTION_TAGS` (the `get_resume` section names), dropdown only:
      `resolveOnSpace` is off so text like "my #1 skill" stays text. Sent as a
      "Focus sections: …" block. Serializing lives in `resume-ai-prompt.ts` (tested)

## Batch 3 — Attach menu

Files: `ResumeAiTab/ResumeAiPromptComposer.tsx` (`AttachResumeSheet`), local search in
`-ai/-utils/local-*-tools.ts`.

- [x] Search box + 20 rows at a time with **Load more** (`useInfiniteQuery` over
      `listLocalResumes` / `searchLocalLibrary`, which page with `offset` / `limit` +
      `count()` in TanStack DB). Both now take `Pick<LocalToolContext, …>` so the UI passes
      `{ db }` instead of faking a tool context
- [x] `+` opens a **type picker** (`ResumeAiAttachSheet.tsx`): Résumés, Experiences, Bullets,
      Education, Projects, Talks, Skills, Summaries → searchable list with a back button
- [x] Rows become `@` chips (`attachChip`, label capped at 40 chars, full name kept in
      `data`); rows already in the message are highlighted, library rows on the active
      résumé get an "On résumé" badge, and the active résumé itself is disabled
- [x] On send, one block per type: `Referenced experiences:\n- "…" (section: experience, id: …)`
- [x] System prompt rule: referenced items are the focus; use their ids directly
- [x] `data-test`: `resume-ai-attach-sheet`, `-types`, `-type-<kind>`, `-list-<kind>`,
      `-search`, `-load-more`, `-back`, `-option-<id>`
- [x] Typed `@` mentions now search the local DB too (they used the server
      `resumeListQueryOptions`, so a fresh clone didn't show up until sync)
- [ ] Decide: `search_library` doesn't cover certifications, volunteers or languages, so
      they're left out of the picker for now

## Batch 4 — Live preview beside the chat

Files: `-ai/-components/EventSourcedResumeAiTab.tsx`, `ResumeAiLivePreview.tsx`,
`-ai/-hooks/use-resume-ai-preview-panel.ts`, `features/resume/use-resume-pdf.tsx`,
`features/agentic-tools/resume-write-tools.ts`.

- [x] Open the panel the first time a turn calls a résumé **write** tool (not read tools).
      `resumeWriteToolNames` is built from the tool definitions; job tracker writes don't
      count, and neither do writes in history loaded on page open (tested)
- [x] Split layout with `components/ui/resizable.tsx`: chat left, preview right. The chat
      stays in the same panel whether or not the preview is open, so a typed draft
      survives; in the split, messages scroll and the composer is pinned at the bottom
- [x] Preview follows the chat's active résumé
- [x] Debounce PDF renders (800 ms) during a burst of tool calls; keep the last render on
      screen with an "Updating" badge. The PDF logic moved from the Preview tab into
      `useResumePdf`, which now keys on document content instead of object identity
- [x] Close / minimize to a 44 px rail / maximize, plus a "Preview" button in the chat
      header
- [x] Once closed, don't auto-reopen in the same conversation (clearing the chat resets it)
- [x] Mobile (< 1024 px): no side panel; "Preview" opens a bottom sheet
- [ ] Nice extra: highlight the section that just changed
- [x] `data-test` ids: `resume-ai-preview`, `-toggle`, `-iframe`, `-updating`, `-minimize`,
      `-maximize`, `-unmaximize`, `-restore`, `-rail`, `-close`, `-sheet`,
      `resume-ai-split`, `resume-ai-split-handle`
- [ ] Unsaved template picks on the page don't reach the side preview; it renders the
      saved template

## Batch 5 — Browser verification (needs the dev server and a signed-in user)

- [x] Live preview at 1440 px and 994 px: split sizes, rail, maximize, close, bottom sheet,
      chat scrolled to the end on open, draft kept, PDF blob valid. The embedded Cursor
      browser doesn't paint PDF pages in screenshots (the Preview tab looks the same
      there), so eyeball the rendered page in a normal browser once

- [ ] Layout column: reload and accept the reset, reorder experiences, pick bullets on an
      experience, pick skills in a group, clone a résumé, delete a library bullet two
      résumés use (both layouts drop it)
- [ ] Composer on the dark theme: chip legibility, `/` and `@` popovers
- [ ] Keyboard: Enter sends, Shift+Enter adds a newline, undo/redo work
- [ ] Chat markdown fixture on both themes and inside the user bubble
- [ ] Events tab: device squash with real synced events
