# exp-landing: scrums.com-style landing page experiment

Plan for rebuilding the marketing landing page after the scrums.com design
language, replacing the current "swirly" animations (ripples, floating parts)
with isometric **hairline** figures (folder/drawer + wardrobe/rail animations).
All experiments live on a separate route `/exp-landing` so the production `/`
landing stays untouched until we decide to promote.

Status: **built and rendering on `/exp-landing`** (2026-11-11). Phases 0–5 are
done; Phase 6 (promotion decision) and Phase 7 (cleanup) are open. Work top to
bottom; tick items as they land. Sources: `https://www.scrums.com`,
`https://github.com/lucasmarkes/hairline`.

Companion: [`design.md`](./design.md) — reusable design lessons, gotchas and
open design TODOs extracted from this build.

Progress log:

- 2026-11-10 — plan written; route scaffold created.
- 2026-11-11 — full page built (12 sections + nav/footer), 11 hairline figures
  wired, theme mapping + dark-border fix, responsive pass, headless Chromium
  checks at 1440 and 390 (no console errors, no horizontal overflow).
- 2026-11-11 — added the **workbench preview** after the hero: a scripted
  stream (thinking → markdown → `set_summary` tool call) that edits the résumé
  panel beside it. Runs only while on screen; loops; reduced-motion renders the
  finished pass statically.

---

## 0. Goal & scope

- **Goal**: a marketing landing page that feels like scrums.com — strong
  section rhythm, big typographic statements, isometric/line-art motion — but
  built from the hairline figure library instead of swirly CSS animations.
- **Non-goal**: copying scrums.com's copy/brand verbatim in production. The
  `/exp-landing` route is a lab: faithful structural clone first (to learn the
  layout + motion), then adapt content to agentic-json-resume.
- **Constraint**: do not touch the existing `/` route (`LandingHero`,
  `LandingFeatures`, …) until Phase 6 promotes a winner.
- **Animation rule**: no new "swirly" effects (ripples, floating parts,
  pulsing dots) in exp-landing. Motion comes from hairline figures (pointer-
  driven isometric lines) plus simple scroll reveals.

## 1. References

### scrums.com (design reference)

Sections, top to bottom:

1. Sticky nav (logo, links, Start free / Talk to sales).
2. Hero: "Enterprise AI platform for software engineering. Sorted." + platform
   demo panel + CTAs. Stats strip: "Thousands of companies served · Since 2012 ·
   Building software 5 · Delivery regions".
3. Problem: "Software engineering management is fragmented." before→after list.
4. Platform: "What is an enterprise AI platform…" + SEOP control plane.
5. Govern AI agents.
6. Custom software development, delivered monthly.
7. Hire AI engineers / build the right team.
8. One AI catalog.
9. Engineering intelligence / AI observability (Mission Control).
10. "Defining software since 2012" case studies.
11. Pricing + Versions.
12. FAQ accordion.
13. Final CTA: "Software engineering. Sorted."
14. Footer + "More for AI systems" links.

Visual traits: max-width container with side borders, mono small caps labels,
serif display headings, primary-tinted section bands, 12-col grids, generous
vertical padding, `border-x border-border/50` rhythm.

### hairline (motion reference)

- Package: `@lucasmarkes/hairline` (ESM only, React 18+ optional peer, MIT).
- React entry: `@lucasmarkes/hairline/react`; imperative: `@lucasmarkes/hairline`.
- Components fill parent width at 5:4 aspect ratio; server-rended as empty box
  (no layout shift). Draw into DOM in effect.
- Options: `intensity` (0–1), `theme` (auto/light/dark), `label`, `onRead`,
  `play`. Theme via CSS vars `--hairline-plate/hi/edge/mid/lo/stroke`.
- Reduced motion + off-screen perf handled by lib. Shared rAF loop.

Figures to use (mapping below):

- Folder/drawer family: `Drawer`, `Cabinet`, `Vault`, `Lockers`, `Rebuild`,
  `Stack`, `Settle`.
- Wardrobe: `Rail` (garment rail with hangers).
- Hero/illustration candidates: `Terrain`, `Phosphor`, `Riffle`, `Exploded`,
  `Phone`, `Laptop`, `Branches`, `Relay`, `Hub`, `Slow`, `Turntable`,
  `Terminal`, `Plot`, `Loupe`, `Sieve`, `Basket`.

## 2. Route & file layout

New route (dev-gated, like `/test`):

Actual layout (names are kebab-case, matching the rest of `routes/`):

```
apps/web/src/routes/exp-landing/
  index.tsx                       # createFileRoute("/exp-landing/"), ssr:false, dev-only
  -components/
    exp-landing-page.tsx          # composition
    primitives.tsx                # Section, SectionIntro, FigurePanel, FigureSplit
    exp-navbar.tsx
    exp-hero.tsx                  # hero + stats strip
    exp-workbench.tsx             # scripted AI workbench preview (after hero)
    exp-problem.tsx               # Drawer
    exp-platform.tsx              # Exploded
    exp-govern.tsx                # Vault
    exp-compose.tsx               # Slow + 3 feature cards
    exp-hire.tsx                  # Rail (the wardrobe)
    exp-catalog.tsx               # Hub
    exp-intelligence.tsx          # Plot
    exp-proof.tsx                 # Branches + case-study cards
    exp-pricing.tsx               # Stack + tiers
    exp-faq.tsx
    exp-final-cta.tsx             # Riffle
    exp-footer.tsx
  -hooks/
    use-workbench-stream.ts       # ticking loop + IntersectionObserver gating
  -utils/
    content.ts                    # nav, stats, section copy
    workbench-script.ts           # scripted steps (perf-harness shaped)
```

Hairline components are reused from the existing
`apps/web/src/components/ui/hairline.tsx` wrapper (extended with the missing
figures) so there is one theme-mapped API. Shared reusable bits still go to
`apps/web/src/routes/-components/` only after a second route needs them.

Route registration: TanStack generates `routeTree.gen.ts` on dev/build. After
creating `index.tsx`, run `pnpm --dir apps/web dev` (or build) to regenerate.
Do not hand-edit `routeTree.gen.ts`.

## 3. Phase plan

### Phase 0 — Setup

- [x] Install `@lucasmarkes/hairline` (already at `^0.5.1` in `apps/web/package.json`).
- [x] Create `/exp-landing` route skeleton (dev-gated, `ssr: false`).
- [x] Add a `data-test="exp-landing-page"` root.
- [x] Verify dev server boots and route renders.
- [x] Hairline theme vars: the existing `components/ui/hairline.tsx` wrapper maps
      the palette to shadcn tokens. Extended it with the missing figures
      (`Drawer`, `Rail`, `Plot`, `Sieve`, `Basket`, `Loupe`, `Plug`, `Query`).

### Phase 1 — Shell & rhythm

- [x] Reproduce scrums.com container rhythm: `max-w-360`, `border-x border-border/50`,
      tinted bands `bg-primary/[0.04]`.
- [x] Sticky nav with logo, links, two CTAs.
- [x] Footer with product/resources/more columns.
- [x] Dark/light sanity check (screenshots at 1440 + 390).

### Phase 2 — Hero experiment (core animation swap)

- [x] Replace swirly `BackgroundRippleEffect` with `Terrain` as the hero visual.
- [x] Layered product demo: `Exploded` in the platform section (with `play`).
- [x] Keep headline + CTAs; stats strip below.
- [x] Measured: no layout shift, no horizontal overflow, figures idle off-screen.

### Phase 3 — Folder & wardrobe animations (the requested swap)

- [x] "Problem": `Drawer` (filing cabinet; pointer pulls a drawer out).
- [x] "The wardrobe": `Rail` (garment rail; hangers rock away from the pointer).
- [x] "How it works": `Slow` (crates on a conveyor belt).
- [x] "Control": `Vault` (dial + bolts) — governance / reversibility.
- [x] "Library": `Hub` (tiles around a hub).
- [x] "Insight": `Plot` (bar chart).
- [x] "Proof": `Branches` (commit graph).
- [x] "Pricing": `Stack` (call stack).
- [x] Final CTA: `Riffle` (card tray).
- [x] Each figure has a descriptive `label`; intensity 0.6–0.7.

### Phase 4 — Content sections

- [x] Section set: problem, platform, control, how-it-works, wardrobe, library,
      insight, proof, pricing, FAQ, final CTA, footer.
- [x] FAQ accordion (shadcn Accordion).
- [x] Final CTA + footer.
- [x] Content mode: **B (adapted to the résumé product)** — scrums.com rhythm,
      our copy. Easier to promote than a literal clone.

### Phase 4.5 — Workbench preview (dummy stream)

Preview of the AI workbench right after the hero, so visitors see the whole
application loop before opening the dashboard. It copies the real AI tab:
chrome row (Preview/settings/clear), chat + composer, and the live preview
panel with the real `Preview | Changes | Letter | Q&A` tabs.

- [x] Scripted source shaped like the perf harness
      (`routes/_dashboard/dev/chat-stress/-utils/fake-chat-stream.ts`): thinking →
      markdown → tool start/args/result. Landing-local copy in
      `-utils/workbench-script.ts` because importing the dev harness pulls in the
      DB, the viewer and the full chat UI.
- [x] State is an ordered `parts` timeline (`thinking` | `text` | `tool`), so
      text and tool calls interleave instead of one mutable tool slot. The
      reducer (`applyWorkbenchStep`) is shared by the ticking hook and the
      static reduced-motion render.
- [x] The prompt types itself into the composer (2 chars / 45ms), the send button
      fills in, then `send` moves the text into the user bubble.
- [x] Six tools, in playbook order: `save_job` (capture the posting) →
      `set_summary` → `set_experience_bullets` → `set_skills` →
      `save_cover_letter` → `save_application_answers`.
- [x] Tool chips mirror `ResumeAiToolPanels`: Wrench icon, `Save Job` style
      label, state pill (`input-streaming` → `complete`) and a success summary.
      The letter and answer tools also render the green success cards from
      `ResumeAiCoverLetterTool` / `ResumeAiApplicationAnswersTool`, with a
      working Preview button.
- [x] Panel tabs mirror `ResumeAiLivePreview` (`Preview | Changes | Letter |
      Q&A`) and switch themselves when a writing tool lands:
      `set_experience_bullets` → Changes (shows `+n −m`), `save_cover_letter` →
      Letter, `save_application_answers` → Q&A, `set_skills` → Preview.
- [x] A manual tab click pins the view for the rest of the run; the next loop
      resets to Preview and unpins.
- [x] `Changes` renders line diffs for the tools that have landed; `Letter`
      renders the cover letter paper; `Q&A` renders three answers, one with a
      `needs your detail` chip. Both show a hint until their tool lands.
- [x] The résumé paper reflects `set_summary`, `set_experience_bullets` (three
      rewrites, two strikes) and `set_skills` (TypeScript/React first).
- [x] `useWorkbenchStream` ticks the steps, loops with a 4.4s hold, and renders
      the finished pass for `prefers-reduced-motion` (no timers).
- [x] Runs only while on screen (`IntersectionObserver`, threshold 0.25); leaving
      the viewport stops the timer.
- [x] Composer mirrors `ResumeAiPromptComposer`: rounded-2xl shell on
      `bg-primary/10`, placeholder per state ("Queue a follow-up…" while busy),
      model row, résumé chip, send/stop buttons, and a status line
      (Drafting / Request sent / Streaming response / Calling tools / Ready).
- [x] Mobile order is chat → composer → preview; the tab strip takes its own row
      below `lg` so the panel title is never squeezed.
- [x] Labelled "scripted demo · no API calls" so it is never mistaken for live.
- [x] `data-test="exp-workbench"`, `exp-workbench-frame`, `-chat`, `-composer`,
      `-resume`, `-letter`, `-answers`, `-changes`, `-tabs`, `-preview`,
      `-ai-chrome`, `-replay`, plus `-letter-card` / `-answers-card`.

### Phase 5 — Polish

- [x] Theme tokens: hairline wrapper maps to shadcn tokens; dark mode works.
      Added a scoped rule so the repo's dark-mode border reset does not erase
      the landing's borders.
- [x] Reduced motion: hairline handles it; `play` figures rest under reduce.
- [x] Performance: verified off-screen figures idle; rail animates + responds
      to hover in headless Chromium.
- [x] Responsive: figures capped at `max-w-md` below `lg`, full width above;
      checked 1440 and 390.
- [x] `data-test` attributes on sections for e2e.

### Phase 6 — Promotion decision

- [ ] Compare exp-landing vs current `/` (screenshots, motion, perf).
- [ ] If winner: either replace `/` landing components or keep both and A/B.
- [x] Keep `/exp-landing` as lab route regardless (dev-gated).

### Phase 7 — Cleanup

- [x] No swirly components exist in the exp-landing path (nothing to remove).
- [x] Chosen hairline figures + intensities documented in sections above.
- [x] Typecheck + lint pass on changed files.

Verification (headless Chromium, 2026-11-11):

- 1440 and 390 widths: no console errors, no horizontal overflow.
- Theme toggle, FAQ accordion, anchor nav (lands at 56px below the sticky nav)
  and mobile menu all work.
- Rail figure animates on its own and responds to hover.
- Workbench preview: streams (0 → 141 tok), completes with the tool result and
  the edited summary, holds ~5s, then loops. Replay restarts it. Scrolling away
  pauses the timer. Under `prefers-reduced-motion` it renders the finished pass
  and never starts a timer. Checked at 390 / 768 / 1440, light and dark.

## 4. Decisions & open questions

Settled:

- Content is **adapted to the résumé product (B)**, keeping the scrums.com
  rhythm and section order.
- Hero figure: **`Terrain`** (81 pillars). `Riffle` is the final CTA.
- Folder motif: **`Drawer`** for the problem section.
- Wardrobe motif: **`Rail`** for the wardrobe section.
- Install from npm (`@lucasmarkes/hairline@0.5.1`), no vendoring.

Open:

- Should hairline replace the existing `HeroDiagram` on `/` later, or coexist?
  Decide in Phase 6.
- Do we promote the whole exp-landing to `/`, or keep the current landing and
  ship exp-landing as an alternate?

## 5. Hairline usage notes (for implementers)

- Import React components from `@lucasmarkes/hairline/react`.
- Each figure fills parent width at 5:4; wrap in a sized container.
- Set `--hairline-plate` to the section background, else plates look wrong.
- `play` walks the figure on its own in a loop; pauses on pointer/focus.
- `theme="auto"` follows `dark` class / `data-theme` / color-scheme.
- SSR: component is empty box on server; no shift. With TanStack Start, fine;
  but exp-landing uses `ssr: false` to keep experiments simple.
- Reduced motion: `play` figures rest; pointer answers remain.
- Accessibility: pass `label` (or `aria-label`) describing the figure.

## 6. Definition of done (experiment)

- `/exp-landing` renders all scrums.com-equivalent sections.
- At least 3 distinct hairline figures used (hero + folder + wardrobe).
- No swirly animations in the exp-landing tree.
- Typecheck + lint pass on new files.
- Screenshots captured for light & dark at 1440px and 375px.

---

## Sources (historical)

- `https://www.scrums.com` (fetched 2026-11-10)
- `https://github.com/lucasmarkes/hairline` README
- Existing landing: `apps/web/src/routes/-components/landing/*`
- Dev-gated route pattern: `apps/web/src/routes/test/index.tsx`
