# Prompt Area Migration — Replace `ResumeAiComposer`

The AI composer was replaced with [Prompt Area](https://prompt-area.com/) — a
zero-dependency shadcn chat input with native `@mentions`, `/commands`, image/file
strips, undo/redo, and inline markdown.

## Status: integrated

- `prompt-area` package installed in `apps/web`; registry source vendored at
  `apps/web/src/components/prompt-area/`
- `ResumeAiPromptComposer.tsx` is the live composer (`ResumeAiComposer.tsx` deleted)
- Controlled segment state lives in the composer
- `/commands` wired to `DIRECTIVES` (`resume-ai-directives.ts`) via `commandTrigger()`
  — typing `/` opens the directive dropdown, selecting inserts a chip
- `@mentions` wired to other resumes via `mentionTrigger()` (fed by
  `resumeListQueryOptions`)
- Send serializes: inline text + chip display text, directive chips append the
  `/command: instruction` block, mention chips append the
  `Referenced resumes:\n- "name" (id: ...)` block
- Empty-state suggestion chips insert directive chips via `insertChip()`
  (no immediate send)
- `editPastPrompt` in `use-event-sourced-resume-ai.ts` now uses the
  `PromptAreaHandle` ref (`setText` + `focus`)
- `data-test` ids preserved: `resume-ai-composer`, `resume-ai-input-shell`,
  `resume-ai-input` (now via `data-test-id`), `resume-ai-send`, `resume-ai-stop`,
  `resume-ai-model-selector`, `resume-ai-status`, `resume-ai-error`,
  `resume-ai-directive-*`

## Remaining work / nice-to-haves

### TODO — Visual QA in browser

- Verify chips render legibly on the dark theme (chip styling, dropdown popover)
- Verify Enter submits, Shift+Enter newlines, and undo/redo work as expected

### TODO — Attachments (files/images)

- The `+` button is back with its prior behavior: it opens the "Reference resumes"
  sheet and inserts an `@mention` chip (coexists with the typed `@` trigger;
  already-referenced resumes are highlighted in the sheet). Remaining question:
  wire prompt-area's `files`/`images` strips for real uploads (needs chat API support).

### Done — Markdown mode

- Enable `markdown` prop for live bold/italic/list rendering in the composer

### Done — Animated placeholder

- Placeholder currently alternates between two strings — confirm animation is
  desired, or pass a single string

### Done — Command auto-resolve

- Consider `resolveOnSpace` for command chips so `/tailor ` chips without a
  dropdown round-trip

### Done — `#tags` for resume sections

- `hashtagTrigger()` could support `#summary`, `#experience` section targeting

Done: the attach sheet searches and pages 20 rows at a time in the query engine, with Load more (`ResumeAiAttachSheet.tsx`). Status of each item lives in [`resume-editor.md`](./resume-editor.md).
