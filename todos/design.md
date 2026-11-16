# Design: lessons & open TODOs

Lessons from building the scrums.com-style `/exp-landing` page with the
`@lucasmarkes/hairline` figures (2026-11-11). Read this before designing another
marketing page, landing section, or animated marketing surface. The goal is to
keep the "expensive editorial + isometric motion" feel without re-learning the
gotchas.

Companion doc: [`exp-landing.md`](./exp-landing.md) (the build plan and status).

---

## 1. Layout system that reads "premium"

- One container rhythm everywhere: `mx-auto w-full max-w-360 border-x border-border/50`.
  `max-w-360` = 1440px, matching the existing landing. The side borders are the
  cheapest way to make a page feel designed.
- Alternate section bands: base, then `bg-primary/[0.04]` (very low tint),
  separated by `border-t border-border/50`. Do not use strong primary fills.
- 12-column grid with a `5 / 7` split is the workhorse:
  text in 5, figure in 7 (or reverse). Add `lg:border-r` on the text column.
- Generous vertical rhythm: `py-16 md:py-24` (sometimes `lg:py-28`). Whitespace
  is the design. Do not compress sections to fit more.
- Sticky nav is `h-14` (56px). Every anchor target needs `scroll-mt-14`, else the
  nav covers the heading. Verified: `#pricing` lands at `top = 56`.
- Mobile: single column, figures capped (see §5), stats strip 2 cols → 5.

## 2. Typography

- Display: `font-serif` (DM Serif Display) at `text-3xl` → `lg:text-5xl` for H2,
  `text-5xl` → `lg:text-7xl` for H1, `leading-[0.98]`/`[1.05]`, `tracking-tight`.
- Eyebrow: `font-mono text-xs uppercase tracking-[0.25em] text-primary`.
- Body: `text-muted-foreground`, `text-base md:text-lg`, `leading-relaxed`,
  max width `42ch–46ch`. Never full-column body text.
- Give each heading exactly one primary-colored phrase:
  `The résumé is the sum of its parts. <span class="text-primary">Sorted.</span>`
- Numbers, figure captions, tags, and readouts are mono: `font-mono text-[10px]`
  with `uppercase tracking-[0.2em]`. Use `tabular-nums` for live readouts.
- The "fig. 01 — terrain" caption under a figure is a cheap, strong detail.

## 3. Hairline figures

- Package: `@lucasmarkes/hairline@0.5.1`. React entry
  `@lucasmarkes/hairline/react`. MIT.
- Use the existing wrapper `apps/web/src/components/ui/hairline.tsx`: it maps
  `--hairline-*` to shadcn tokens. **Extend it** when a figure is missing rather
  than importing the package twice. Missing ones added: `Drawer`, `Rail`,
  `Plot`, `Sieve`, `Basket`, `Loupe`, `Plug`, `Query`.
- Figures fill the parent width at **5:4**. A full-width figure on tablet is
  ~900px tall and makes the page 15,000px long. Cap it: `mx-auto max-w-md
  lg:max-w-none` (see `FigurePanel`).
- `FigurePanel` pattern (in `exp-landing/-components/primitives.tsx`):
  bordered panel + figure + caption bar. Wire `onRead` to show the live caption
  (`gap 6.1`, `drawer 1 · 0`, `rate 1.00×`). It reads as instrumentation and
  makes the animation feel intentional.
- `play` gives ambient motion (loops until pointer/focus). Use `play` on
  section figures; keep `intensity` 0.6–0.7 for marketing.
- `theme="auto"` follows `.dark` / `data-theme` / `color-scheme`.
- Set `--hairline-plate` to the actual background behind the figure, or the
  plate looks wrong. The shadcn wrapper maps it to `var(--background)`.
- Typing a figure as a prop: `ComponentType<HairlineProps>` where `HairlineProps`
  comes from `@lucasmarkes/hairline/react`.
- Accessibility: always pass `label` / `aria-label` describing the figure.
  Decorative L-corner marks get `aria-hidden`.

## 4. Theme & the dark-mode border trap (important)

- DaisyUI supplies `light` / `dark`; `ThemeProvider` sets `.dark` + `data-theme`
  on `<html>`. `theme="auto"` on figures works out of the box.
- **Gotcha:** `apps/web/src/styles.css` contains:
  `.dark * { border-color: transparent !important; }` (a fork leftover). It
  erases every border in dark mode, including Tailwind border utilities, because
  unlayered `!important` beats layered utilities.
- Fix used on the experiment: a scoped unlayered rule at the end of
  `styles.css`:
  ```css
  .dark .exp-landing,
  .dark .exp-landing *,
  .dark .exp-landing ::before,
  .dark .exp-landing ::after {
    border-color: color-mix(in oklch, var(--color-base-content) 18%, transparent) !important;
  }
  ```
- That rule wins over the reset, but it also flattens accent borders. For
  green accent strokes use `ring-1 ring-primary/40` or
  `shadow-[inset_2px_0_0_0_var(--color-primary)]` — box-shadow/ring is not
  affected by the border reset.
- Long-term option (see TODOs): remove or scope the global dark border reset
  instead of adding per-surface fixes.

## 5. Animation philosophy

- No swirly effects on this surface: no `BackgroundRippleEffect`, no
  `hero-part-float`, no rotating/pulsing decoration. Motion comes from the
  hairline figures answering the pointer, plus static layout.
- One figure per section is enough. 8–11 figures on a long page works because
  hairline shares one rAF loop and idles off-screen.
- Verify motion, don't assume it: take two element screenshots ~1s apart and
  compare hashes; then hover and compare again. (See §8.)
- Honour `prefers-reduced-motion`; hairline rests `play` figures and keeps
  pointer answers. Do not add custom CSS animations without a reduce guard.

## 6. Responsive rules

- Breakpoint for the split layout is `lg` (1024px). Below that, single column.
- Cap figures at `max-w-md` below `lg`; full width above.
- Stats strips: `grid-cols-2 md:grid-cols-5`, with computed `border-l`/`border-t`
  based on index. Check the odd last cell.
- Nav: links hidden below `lg`, menu button; theme + "Talk to us" hidden below
  `sm`/`md`. Keep one primary CTA visible at all widths.
- Test at **1440 and 390**. Also check 1000px (tablet) because that is where
  full-width figures used to explode.

## 7. Content & copy

- Borrow the **rhythm**, not the copy: eyebrow → big heading with one colored
  phrase → 1–2 sentence lead → list/grid/figure → CTA.
- Keep headings short (`max-w-[15ch]–[22ch]`, `text-balance`) and leads
  `max-w-[42ch]–[46ch]`, `text-pretty`.
- Use small numeric indices (`01`, `02`, `03`), mono tags, and "fig. NN" labels
  to create editorial texture.
- Repeat a motif (here "Sorted.") in the hero and final CTA.
- Pricing/feature grids need exactly one visually distinct featured card
  (`bg-base-100` against the tinted band + "Popular" tag).

## 8. Verification workflow (what actually caught issues)

- `pnpm --dir apps/web build` regenerates `routeTree.gen.ts`; never hand-edit it.
- `pnpm --dir apps/web check-types` (`tsc`) and
  `pnpm exec vp lint apps/web/src/routes/exp-landing` must pass.
- The in-app browser screenshot can fail ("needs a visible tab"). Headless
  fallback that works here: launch `playwright-core@1.60.0` with the cached
  Chromium at `~/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome`,
  `--no-sandbox`. `playwright-cli` wants the `chrome` distribution, which is not
  installed.
- Measure, don't eyeball:
  - `document.documentElement.scrollWidth > innerWidth` for horizontal overflow.
  - `body.scrollHeight` to catch runaway figure heights.
  - figure `getBoundingClientRect()` to confirm cap + 5:4.
  - screenshot hash before/after to prove animation and hover response.
- Interaction smoke test: theme toggle flips `.dark`, FAQ accordion opens,
  anchor nav lands below the sticky nav (`top ≈ 56`), mobile menu opens.
- Collect `console` errors and `pageerror`; target zero.

## 9. Code organization

- Route: `routes/exp-landing/index.tsx` (dev-gated, `ssr: false`).
- Route-only UI: `-components/`, data: `-utils/content.ts`.
- Put layout primitives in one `-components/primitives.tsx`
  (`Section`, `SectionIntro`, `FigurePanel`, `FigureSplit`) instead of repeating
  the grid classes in every section.
- Keep section files small and named `exp-<section>.tsx`.
- Function/component args: one named object (`{ id, tone, children }`), per repo
  rules.
- React 19 compiler: no `useMemo` / `useCallback`.
- `ui/` is shadcn codegen; `hairline.tsx` lives there because it came from the
  registry, but new custom wrappers should go in a named concern folder
  (`components/hairline/`) if we outgrow it.

## 10. Live product previews (scripted data)

The workbench preview (`exp-landing/-components/exp-workbench.tsx`) is the
pattern to copy when a landing needs to show the real product without a login.

- **Shape the data like the real stream.** The script emits the same phases as
  `routes/_dashboard/dev/chat-stress/-utils/fake-chat-stream.ts` (thinking →
  markdown text → tool start/args/result). Anyone who has seen the dashboard
  recognises it, and swapping in the real source later is mechanical.
- **Do not import the dev harness from marketing.** It drags in the
  event-sourced DB, `useViewer`, persistence and the full `ResumeAiChatUI`.
  Keep a landing-sized copy in `-utils/workbench-script.ts` and comment why.
- **Render the effect of the tool call, not just the call.** `set_summary`
  rewrites the summary, `set_experience_bullets` rewrites three bullets and
  strikes two, `set_skills` reorders the chips. A chat bubble alone does not show
  what the product does.
- **Order the timeline, do not keep one mutable tool slot.** Multiple tool calls
  interleave with text, so state is `parts: (thinking | text | tool)[]` and each
  delta appends to the last matching part. One reducer
  (`applyWorkbenchStep`) serves both the ticking loop and the static render, so
  the finished frame can never drift from the animation.
- **Let the panel follow the story.** The preview tabs switch themselves when a
  writing tool lands (`save_cover_letter` → Letter,
  `save_application_answers` → Q&A, résumé diffs → Changes). A manual click
  pins the tab and stops the script from moving it; the next loop unpins.
- **Show the artefacts, not just their names.** The letter and answer tools
  render the same green success cards as the dashboard, and the tabs render the
  actual letter and three Q&As (one deliberately unfinished). That is what sells
  "one prompt, a whole application".
- **Gate on visibility.** `IntersectionObserver` (threshold 0.25) starts/stops
  the tick loop; the preview costs nothing while the user reads the hero. The
  timer lives in a `useEffect` with a cleanup, never in render.
- **Loop with a hold.** Finish → keep the completed pass visible ~5s → reset.
  An instant reset reads as a bug; a long hold lets a visitor arrive mid-story
  and still see the ending.
- **Reduced motion gets the finished pass, not a blank panel.** Render the
  completed state synchronously and skip the timers.
- **Replay is a feature, not an afterthought.** One button with `RotateCcw`
  restarts the loop; it also proves the demo is not a video.
- **Label it.** "Scripted demo · no API calls · loops while it is on screen" is
  the honest version and still sells.
- **Toast/scroll details:** auto-scroll the chat container to the bottom on new
  content (`scrollTop = scrollHeight`), but never scroll the page.
- **Cheap markdown renderer beats a dependency.** Split on blank lines, then
  handle `##`, `- `, `> `, `**bold**` and `` `code` ``. Strip trailing `**` /
  backtick markers so partial tokens do not flash as symbols.
- **Desktop vs mobile:** two columns (`chat | panel`) from `md`, chat first in
  the DOM so mobile reads chat → composer → preview. The four panel tabs need
  their own row below `lg`; inline them only when the panel is wide enough for
  the title plus ~280px of tabs. Chat height is fixed
  (`h-[18rem] md:h-[22rem]`) with `overflow-y-auto`.

## 11. Design TODOs

- [ ] Decide whether `/exp-landing` promotes onto `/` (see `exp-landing.md` §6).
- [ ] If promoting, replace `HeroDiagram` + `BackgroundRippleEffect` on `/` with
      the hairline hero; leave the old landing behind a branch/commit.
- [ ] Extract `FigurePanel` / `FigureSplit` to `components/hairline/` once a
      second route needs them.
- [ ] Fix the global dark-mode border reset properly (scope or remove), then
      delete the `.exp-landing` workaround.
- [ ] Add a scroll-reveal primitive (IntersectionObserver, reduced-motion
      guarded) for section entrances — do not use the old float/ripple keyframes.
- [ ] Add a `prefers-reduced-motion` screenshot check to the verification pass.
- [ ] Run Lighthouse on `/exp-landing` and record accessibility/SEO scores.
- [ ] Add real OG image + metadata to the experiment route if it becomes public.
- [ ] Decide whether figure captions (`onRead`) ship or are a lab-only detail.
- [ ] Add e2e coverage for theme toggle, accordion, anchor offsets, mobile menu.
- [ ] Consider one shared `HairlineFigure` type/registry so section files import
      figures from one place.
- [ ] Decide whether the workbench preview ships on `/`, or only on the lab
      route. If it ships, measure it on low-end mobile before keeping the loop.
- [ ] If the perf harness grows a reusable script module, point
      `workbench-script.ts` at it instead of keeping two copies of the script.
- [ ] Add a pause control to the workbench preview (replay exists; pause does
      not) and stop the loop if the tab is hidden for a long time.

---

## Quick reference

```
Container:   mx-auto w-full max-w-360 border-x border-border/50
Section:     py-16 md:py-24, border-t border-border/50, tone bg-primary/[0.04]
Grid:        grid lg:grid-cols-12; text col-span-5, figure col-span-7
Anchor:      scroll-mt-14 (56px sticky nav)
Eyebrow:     font-mono text-xs uppercase tracking-[0.25em] text-primary
H1:          font-serif text-5xl md:text-6xl lg:text-7xl leading-[0.98]
H2:          font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.05]
Body:        text-muted-foreground text-base md:text-lg leading-relaxed
Figure:      @lucasmarkes/hairline/react, 5:4, max-w-md lg:max-w-none, play
Accent line: ring-1 ring-primary/40 or inset shadow (not border colour in dark)
Preview:     scripted steps in -utils, timer in -hooks, IntersectionObserver
             gated, loop 5s hold, finished pass under prefers-reduced-motion
```
