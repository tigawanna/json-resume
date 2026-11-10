# Résumé editor & layout

Consolidated from `resume-editor.md`, `resume-layout.md`, and the editor/layout
items from `next-release.md`. Dashboard/UI items dropped. Worked in batches, top
to bottom; tick items here and in source when they land.

Out of scope here (no editor code): production layout rollout steps that touch
Turso are tracked below; free/pro plans, OpenRouter observability, and the
`saved-projects.spec.ts` e2e spec live elsewhere.

---

## 1. Résumé layout column

Goal: a résumé's choices (sections, experiences, bullets, skill groups, skills,
projects, ...) live on the résumé row itself, not one link row per choice. Event
log drops from ~1,815 to ~540 events; skill groups stop forking per résumé.

Phases 1-6 are done (layout module, schema column, read/write paths, server side,
data migration, client cleanup). Remaining:

### Browser verification (local DB)

- [ ] Reload, accept the reset (rebuild marker wipes local DB and pulls).
- [ ] Reorder experiences.
- [ ] Pick bullets on an experience.
- [ ] Pick skills inside a skill group.
- [ ] Clone a résumé.
- [ ] Delete a library bullet that two résumés use (both layouts drop it,
      nothing breaks).

### Production rollout (order matters: data script reads link tables, runs between

the two deploys)

- [ ] Back up Turso (`sync_event` backup + `turso db shell ... .dump`).
- [ ] Expand: apply `0008` (adds `resume.layout`).
- [ ] `npx tsx scripts/migrate-resume-layouts.ts` (dry run), check the report,
      then `--write`.
- [ ] Contract: deploy new code, apply `0009` and `0010`.
- [ ] Rebuild every event log, then `VACUUM`.
- [ ] Re-enable Turso lines in `apps/web/.env`.
- [ ] Spot-check a few résumés in production against their pre-migration PDFs.

### Verification

- Unit tests for layout helpers, `layoutFromLinks`, compaction/prune on layouts.
- Per-résumé detail equality before/after migration (all 14).
- Browser: reorder experiences, pick bullets, pick skills in a group, clone a
  résumé, delete a library bullet two résumés use.
- Event count after rebuild.

Settled questions: skill group library page edits group name only; skills picked
per résumé. Section titles stay per résumé (in `layout.sections`).

---

## 2. Chat message rendering (batch 1)

Files: `ResumeAiTab/ResumeAiMessage.tsx`, `ResumeAiMarkdown.tsx`,
`ResumeAiThinkingBlock.tsx`, `ResumeAiToolPanels.tsx`.

- [x] Render parts in order (`getMessageBlocks` gone; `MessagePartView` walks
      `message.parts`).
- [x] User bubble stray `text-5xl` class fixed.
- [x] Markdown: external `a` opens in new tab.
- [x] Markdown: copy button on fenced code blocks.
- [x] Markdown: `em`/`del` keep browser italic/line-through.
- [x] Markdown: streaming partial input.
- [x] Markdown: long URLs and inline code wrap; `pre` and tables scroll.
- [x] Markdown: test fixture with every element.
- [ ] Markdown: bare URLs aren't autolinked (`@tanstack/markdown` 0.0.13 has no
      autolink); revisit when it does, or ask the model for `[text](url)` in prompt.
- [x] Markdown: headings, paragraphs, lists, blockquote, hr, inline code, `pre`,
      tables styled; theme class mismatch fixed; per-message `<style>` deduped.

---

## 3. Composer polish (batch 2)

Files: `ResumeAiTab/ResumeAiPromptComposer.tsx`,
`ResumeAiConversationCard.tsx`, `-ai/-hooks/use-event-sourced-resume-ai.ts`.

- [x] Animated placeholder only while thread is empty.
- [x] Active résumé chip in composer footer.
- [x] `resolveOnSpace` on `/` trigger.
- [x] `markdown` on composer with `normalizeBullets={false}`.
- [x] `#tags` from `SECTION_TAGS`.
- [ ] Visual QA on dark theme: chip legibility, `/` and `@` popovers.
- [ ] Keyboard: Enter sends, Shift+Enter adds a newline, undo/redo work.

---

## 4. Attach menu (batch 3)

Files: `ResumeAiTab/ResumeAiPromptComposer.tsx` (`AttachResumeSheet`), local
search in `-ai/-utils/local-*-tools.ts`.

- [x] Search box + 20 rows at a time with Load more.
- [x] `+` opens type picker (Résumés, Experiences, Bullets, Education, Projects,
      Talks, Skills, Summaries) with back button.
- [x] Rows become `@` chips; already-attached highlighted; library rows on active
      résumé get "On résumé" badge; active résumé disabled.
- [x] On send, one block per type.
- [x] System prompt rule: referenced items are the focus.
- [x] Typed `@` mentions search local DB too.
- [x] `data-test` ids on type picker, lists, search, load-more, back, option.
- [ ] Decide: `search_library` doesn't cover certifications, volunteers or
      languages, so they're left out of the picker for now.

---

## 5. Live preview beside the chat (batch 4)

Files: `-ai/-components/EventSourcedResumeAiTab.tsx`,
`ResumeAiLivePreview.tsx`, `-ai/-hooks/use-resume-ai-preview-panel.ts`,
`features/resume/use-resume-pdf.tsx`,
`features/agentic-tools/resume-write-tools.ts`.

- [x] Open panel first time a turn calls a résumé write tool.
- [x] Split layout with resizable; chat stays in same panel; draft survives.
- [x] Preview follows chat's active résumé.
- [x] Component preview instead of PDF; Preview tab PDF logic in `useResumePdf`.
- [x] Changes tab: line diff of résumé JSON since last message.
- [ ] Changes: browser-check with a real reply (only empty state checked).
- [x] Close / minimize to 44px rail / maximize, plus "Preview" button.
- [x] Once closed, don't auto-reopen in same conversation.
- [x] Mobile (<1024px): no side panel; "Preview" opens bottom sheet.
- [ ] Nice extra: highlight the section that just changed.
- [x] `data-test` ids on panel and controls.
- [x] Unsaved template picks don't reach side preview; pick lives in workbench
      store.

---

## 6. Browser verification (batch 5)

Needs dev server and signed-in user.

- [x] Live preview at 1440px and 994px: split sizes, rail, maximize, close,
      bottom sheet, chat scrolled to end on open, draft kept, PDF blob valid.
- [ ] Layout column: reload and accept reset, reorder experiences, pick bullets on
      an experience, pick skills in a group, clone a résumé, delete a library bullet
      two résumés use.
- [ ] Composer on dark theme: chip legibility, `/` and `@` popovers.
- [ ] Keyboard: Enter sends, Shift+Enter adds newline, undo/redo work.
- [ ] Chat markdown fixture on both themes and inside user bubble.
- [ ] Events tab: device squash with real synced events.

---

## 7. Editor items from other docs

- [ ] Markdown: bare URLs aren't autolinked (see ai-chat.md).
- [ ] `search_library` coverage gap for certifications/volunteers/languages (see
      ai-chat.md).
- [ ] Changes tab browser-check with a real reply (see section 5).
- [ ] Highlight section that just changed (nice extra, see section 5).

---

## 8. Ship gate

- [ ] Fix the 4 pre-existing undo unit-test failures first (see
      sync-compaction.md).
- [ ] `pnpm` typecheck, lint and unit tests pass on the release branch.
- [ ] Merge feature branch, deploy, smoke-test sign-in, sync, AI chat and PDF
      export.

---

## Sources (historical)

Pulled from `next-release.md` (sections 1, 4, 4b, 5 and features A, D),
`prompt-area-migration.md`, `resume-layout.md`, `event-squash.md`,
`ai-tools-audit.md`, `broken-tests-undo-and-compaction.md`, and
`ResumeAiMessage.tsx` TODO. Finished work and design notes stay in git history.
