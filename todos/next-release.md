# Next release

One checklist for everything still open across `todos/`, plus the features planned
next. Finished work and design notes stay in the source docs:

- [`resume-layout.md`](./resume-layout.md) — layout column (phases 1–6 done)
- [`event-squash.md`](./event-squash.md) — squash + undo (planner, server, device, events view, undo done)
- [`ai-tools-audit.md`](./ai-tools-audit.md) — AI tool rework (batches 1–7 done)
- [`prompt-area-migration.md`](./prompt-area-migration.md) — composer swap (integrated)
- [`open-router-optimizations.md`](./open-router-optimizations.md) — routing quality (pinning, `requireParameters`, output cap done)

---

## List 1 — Before shipping

### 1. Layout column: browser checks (local DB)

- [ ] Reload, accept the reset (the rebuild marker wipes the local DB and pulls)
- [ ] Reorder experiences
- [ ] Pick bullets on an experience
- [ ] Pick skills inside a skill group
- [ ] Clone a résumé
- [ ] Delete a library bullet that two résumés use (both layouts drop it, nothing breaks)

### 2. Layout column: production rollout

Order matters: the data script reads the link tables, so it runs between the two deploys.

- [ ] Back up Turso (`sync_event` backup + `turso db shell … .dump`)
- [ ] Expand: apply `0008` (adds `resume.layout`)
- [ ] `npx tsx scripts/migrate-resume-layouts.ts` (dry run), check the report, then `--write`
- [ ] Contract: deploy the new code, apply `0009` and `0010`
- [ ] Rebuild every event log, then `VACUUM`
- [ ] Re-enable the Turso lines in `apps/web/.env`
- [ ] Spot-check a few résumés in production against their pre-migration PDFs

### 3. Event squash: real-data checks

- [ ] Take a `sync_event` backup, run the server squash once against the real DB, check the counts
- [ ] Browser check of device squash with real synced events (only unit-tested so far)
- [ ] Confirm the nightly cron (`/api/cron/squash-sync-events`, 03:30) runs after deploy

### 4. AI composer polish

- [ ] **Animated placeholder only on an empty chat.** The alternating placeholder is a call
      to action, so it should only run while the thread has no messages. Once the user has
      sent anything, show one static placeholder (e.g. "Ask for another change…") and stop
      the animation. (`ResumeAiPromptComposer.tsx` placeholder prop,
      `components/prompt-area/animated-placeholder.tsx`)
- [ ] Visual QA on the dark theme: chip legibility, `/` and `@` dropdown popovers
- [ ] Keyboard: Enter sends, Shift+Enter adds a newline, undo/redo work
- [ ] Show the active résumé as a chip in the chat UI (left over from AI tools batch 1)

### 4b. Chat markdown rendering

Messages render through `ResumeAiMarkdown.tsx` (`@tanstack/markdown` 0.0.13 +
`@tanstack/highlight`). Only tables have custom components, and the
`resume-ai-markdown` class has no styles behind it. Tailwind's reset strips list
bullets, heading sizes and spacing, so most markdown arrives flat.

- [ ] Style every element the model sends: `h1`–`h4`, `p`, `ul` / `ol` (bullets,
      numbers, nesting), `li`, `blockquote`, `hr`, `a` (opens in a new tab), inline
      `code`, `pre` code blocks (background, padding, horizontal scroll, copy button),
      `strong` / `em`, task lists. Either custom `components` or a scoped
      `.resume-ai-markdown` stylesheet; `@tailwindcss/typography` isn't installed
- [ ] Theme colours only (DaisyUI / shadcn tokens) so it reads well on light and dark,
      and inside the user bubble (`text-primary-foreground`)
- [ ] Streaming: half-finished markdown mid-stream (open code fence, half a table, a
      dangling `**`) shouldn't flash broken layout; check how `@tanstack/markdown`
      handles partial input, and close open fences before rendering if it doesn't
- [ ] Code block highlighting matches the app theme (the highlighter currently loads every
      language; trim to the likely ones if bundle size shows up)
- [ ] Long words, URLs and JSON don't overflow the message bubble
- [ ] Test fixture with every element, checked in the browser on both themes

### 5. Attach menu: attach any library item, not just résumés

Today `+` opens the "Reference resumes" sheet, which works well. The new flow lets `+`
open a list of things you can attach:

- [ ] `+` opens a **type picker**: Résumés, Experiences, Bullets, Education, Projects,
      Talks, Skills, Summaries
- [ ] Tapping a type opens **that type's list** with a search box and a back button to the
      type picker
- [ ] Lists show 20 rows at a time with a **Load more** button. Paging happens in the query
      engine (`queryOnce` with `where` / `offset` / `limit` plus a `count()` query), never
      with array methods on a loaded list (rule 7 in the AI tools audit). Reuse the local
      `search_library` implementation, which already searches and pages one section at a
      time; résumés reuse `listLocalResumes`
- [ ] Tapping a row attaches it as a chip; rows that are already attached are highlighted
- [ ] On send, each type gets its own reference block, e.g.
      `Referenced education:\n- "BSc Computer Science" (id: …)`, next to the existing
      `Referenced resumes:` block
- [ ] System prompt: referenced items are what the user wants the model to focus on. Use
      them directly (`attach_library_items`, `upsert_*` with the id) instead of scanning the
      whole source résumé
- [ ] `data-test` ids on the type picker, each list, search box and load-more button
- [ ] Gap to decide: `search_library` doesn't cover certifications, volunteers or languages
      yet. Add them, or leave them out of the picker for now

### 6. Ship gate

- [ ] `pnpm` typecheck, lint and unit tests pass on the release branch
- [ ] Merge the feature branch, deploy, smoke-test sign-in, sync, the AI chat and PDF export

---

## List 2 — Features to build next

### A. Live résumé preview beside the chat

When the assistant starts editing a résumé, the chat narrows and a live PDF preview
opens next to it (like the canvas / artifact panels in other chat apps).

- [ ] Open the panel automatically the first time a turn calls a **résumé write tool**
      (the setters, `upsert_*`, `set_skills`, `remove_from_resume`, `reorder_section`,
      `attach_library_items`, `replace_resume_document`, `clone_resume`,
      `tailor_resume_for_job`, …), but not for read tools
- [ ] Split layout with the existing `components/ui/resizable.tsx`: chat on the left,
      preview on the right using `ResumePdfPreviewCard`
- [ ] Preview follows the chat's **active résumé** (`activeResumeId`), so after a clone or
      tailor it shows the new copy
- [ ] Live updates: tool writes land in TanStack DB and live queries re-render. Debounce
      the PDF render so a burst of tool calls doesn't re-render ten times, and keep the
      last render on screen while the next one builds (no flicker)
- [ ] Controls: **close**, **minimize** to a slim rail, **maximize**, and a "Preview"
      button in the chat header to reopen it
- [ ] Respect the user's choice: once closed, don't auto-reopen in the same conversation
- [ ] Mobile: no side panel; the "Preview" button opens a bottom sheet instead
- [ ] Nice extra: briefly highlight the section that just changed
- [ ] `data-test` ids on the panel and its controls

### B. Event squash refinement

**How it works today:** squashing is per row (`modules/sync/squash-plan.ts`). For each
row, the newest event is kept as the truth (update events carry the full row, deletes
stay as tombstones), and every earlier event older than the cutoff is removed. The
cutoff is 24h by default, and an hour at minimum on the server. It runs nightly on the
server and after every sync on the device; synced device events older than 7 days are
also pruned.

That is already the "fold everything from creation up to the cutoff into one update"
idea, because each kept update holds the whole row and its `previous` holds the state
at the cutoff. The layout column also fixed most of the denormalization: a résumé's
choices now live in its single `resume` row. Library rows (experiences, bullets,
skills…) are still separate rows, each squashed on its own.

- [ ] Make the retention window a **per-plan setting** instead of the
      `DEFAULT_RETENTION_MS` constant (e.g. pro keeps 7 days of undo history, free keeps
      24h or less). See section C
- [ ] **Coalesce unsynced device events before push.** Pending outbox events are never
      squashed today, so a long offline AI session pushes every intermediate state.
      Merge consecutive pending updates to the same row into one (newest payload, oldest
      `previous`). First check that `event-sourced-collection` allows rewriting pending
      outbox rows without breaking `localSeq` (undo uses those ranges)
- [ ] Optional: **résumé-scoped squash** that squashes a résumé row and the library rows
      it links to with one cutoff, matching how the per-résumé events view groups them
- [ ] Later (from `event-squash.md`): drop very old tombstones once every device is past
      them; undo for library entries from their own pages

### C. Free / pro plans (groundwork, no payments yet)

Everyone is on free for now and the plan is a hard-coded flag. Because the app is
local-first, limits are enforced where data reaches the server: at the event level.

- [ ] **Plan flag** on the user (`"free" | "pro"`, default `"free"`). Add it through
      Better Auth `additionalFields` and `auth:migrate` (never edit the auth schema by
      hand), or as a separate Drizzle table if that's cleaner
- [ ] **One limits config** (e.g. `config/plans.ts`) per plan: max résumés (free: 10),
      events pushed per day/month, server retention, device retention, and whether
      pending events are coalesced before push
- [ ] **Event push quota (server):** the sync push endpoint counts a user's events in the
      window and rejects pushes over quota with a typed error. Local writes keep working;
      events wait in the outbox
- [ ] **Stricter compaction on free:** shorter retention on the server and the device,
      with outbox coalescing always on (section B)
- [ ] **Résumé cap:** block create, clone and import past the limit in the UI and in the
      AI tools (`create_resume`, `clone_resume`, `tailor_resume_for_job`). Also check on
      the server at push time, and define what happens to a résumé insert that is
      rejected after the device already has it (e.g. reject the batch, mark the event
      skipped, show the upgrade prompt)
- [ ] **Sync status UI:** a clear "Sync paused — free plan limit reached" state instead of
      a silent failure
- [ ] **Plan UI:** plan badge, usage meters (résumés x/10, events this period), and an
      "Upgrade" button that says "coming soon"
- [ ] **Admin:** switch a user's plan from the admin tables / data page
- [ ] Optional: tie AI credits (`ResumeAiCredits`) to the plan as well
- [ ] Later: Stripe checkout + webhook flips the flag

### D. Composer extras (from the prompt-area migration)

- [ ] File and image uploads through prompt-area's `files` / `images` strips (needs chat
      API support)
- [ ] `markdown` prop for live bold / italic / list rendering in the composer
- [ ] `resolveOnSpace` so `/tailor ` becomes a chip without opening the dropdown
- [ ] `#tags` for section targeting (`#summary`, `#experience`) via `hashtagTrigger()`

### E. OpenRouter observability

Provider pinning, `requireParameters`, explicit output caps and cached-token logging are
already in place (`features/agentic-tools/openrouter-routing.ts`,
`stream-resume-chat.server.ts`).

- [ ] Log which provider served each turn, alongside its request id and model config
- [ ] Response rating (thumbs up/down) tied to that request id, so bad answers can be
      traced to a provider and that provider can be pinned out
- [ ] Cost per turn that counts cached input, to compare models and providers on real spend
