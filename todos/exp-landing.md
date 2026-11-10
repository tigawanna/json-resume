# exp-landing: scrums.com-style landing page experiment

Plan for rebuilding the marketing landing page after the scrums.com design
language, replacing the current "swirly" animations (ripples, floating parts)
with isometric **hairline** figures (folder/drawer + wardrobe/rail animations).
All experiments live on a separate route `/exp-landing` so the production `/`
landing stays untouched until we decide to promote.

Status: planning. Nothing implemented yet. Work top to bottom; tick items as
they land. Sources: `https://www.scrums.com`, `https://github.com/lucasmarkes/hairline`.

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

```
apps/web/src/routes/exp-landing/
  index.tsx                 # createFileRoute("/exp-landing"), ssr:false, dev-only
  -components/
    ExpLandingPage.tsx      # composition
    ExpNavbar.tsx
    ExpHero.tsx
    ExpStatsStrip.tsx
    ExpProblem.tsx
    ExpPlatform.tsx
    ExpGovern.tsx
    ExpCustomDev.tsx
    ExpHire.tsx
    ExpCatalog.tsx
    ExpIntelligence.tsx
    ExpCaseStudies.tsx
    ExpPricing.tsx
    ExpFaq.tsx
    ExpFinalCta.tsx
    ExpFooter.tsx
    sections/...             # if a section grows
  -hooks/
    use-hairline-theme.ts    # maps DaisyUI tokens -> --hairline-* vars
  -utils/
    scrums-sections.ts       # content data for the clone
```

Shared (reusable) bits go to `apps/web/src/routes/-components/` only after a
second route needs them. Hairline wrapper (if we add one) goes to
`apps/web/src/components/hairline/` (named concern folder), not `ui/`.

Route registration: TanStack generates `routeTree.gen.ts` on dev/build. After
creating `index.tsx`, run `pnpm --dir apps/web dev` (or build) to regenerate.
Do not hand-edit `routeTree.gen.ts`.

## 3. Phase plan

### Phase 0 — Setup

- [ ] Install `@lucasmarkes/hairline` (add to `apps/web/package.json` deps).
- [ ] Create `/exp-landing` route skeleton (dev-gated, `ssr: false`).
- [ ] Add a `data-test="exp-landing-page"` root.
- [ ] Verify dev server boots and route renders empty shell.
- [ ] Add hairline CSS vars to global theme or per-section wrapper; confirm
      `--hairline-plate` matches page background in both light/dark.

### Phase 1 — Shell & rhythm

- [ ] Reproduce scrums.com container rhythm: `max-w-360`, `border-x border-border/50`,
      section bands with `border-t border-primary/20 bg-primary/10`.
- [ ] Sticky nav with logo, links, two CTAs.
- [ ] Footer with "More for AI systems" column.
- [ ] Dark/light sanity check.

### Phase 2 — Hero experiment (core animation swap)

- [ ] Replace swirly `BackgroundRippleEffect` with a hairline figure as the hero
      visual. Candidates: `Terrain` (pillars rising around pointer) or `Riffle`
      (card tray). Test both; pick one.
- [ ] Add a layered product demo panel (replaces `HeroDiagram` floating parts):
      use `Exploded` or `Phone`/`Laptop` (layered windows) with `play`.
- [ ] Keep headline + CTAs; stats strip below.
- [ ] Measure: no layout shift, no rAF work when off-screen (hairline handles).

### Phase 3 — Folder & wardrobe animations (the requested swap)

- [ ] "Problem" section: use `Drawer` or `Cabinet` to visualize fragmented →
      consolidated (drawers sliding out / blades pulling out on hover).
- [ ] "Govern / catalog" section: use `Rail` (garment rail with hangers) as the
      "wardrobe" motif for browsing catalog items.
- [ ] "Delivery pipeline" section: use `Slow` (crates on belt) or `Branches`
      (commit graph) for delivery flow.
- [ ] "Engineering intelligence" section: use `Terminal` or `Plot` for metrics.
- [ ] "Case studies" / grid: use `Hub`/`Relay`/`Settle` for connection motif.
- [ ] Each figure gets `aria-label` (or `label`) for accessibility; `intensity`
      tuned (default 0.5, try 0.7 for hero).

### Phase 4 — Content sections

- [ ] Port all scrums.com sections (govern, custom dev, hire, catalog,
      intelligence, case studies, pricing, versions).
- [ ] FAQ accordion (shadcn Accordion).
- [ ] Final CTA + footer.
- [ ] Decide content mode: faithful clone (A) vs adapted to résumé product (B).
      Default B for any promotion; A is fine while experimenting.

### Phase 5 — Polish

- [ ] Theme tokens: verify hairline vars in dark theme; set `--hairline-plate`
      to page bg per section.
- [ ] Reduced motion: ensure `play` figures rest; pointer answers still work.
- [ ] Performance: check rAF stops when idle; no jank at 1440px & 375px.
- [ ] Responsive: figures fill width at 5:4; check mobile stacking.
- [ ] `data-test` attributes on sections for e2e.

### Phase 6 — Promotion decision

- [ ] Compare exp-landing vs current `/` (screenshots, motion, perf).
- [ ] If winner: either replace `/` landing components or keep both and A/B.
- [ ] Keep `/exp-landing` as lab route regardless (dev-gated).

### Phase 7 — Cleanup

- [ ] Remove unused swirly components from exp-landing path only.
- [ ] Document chosen hairline figures + intensities in this file.
- [ ] Typecheck + lint on changed files.

## 4. Open questions

- Do we want the faithful scrums.com clone (A) or adapted résumé content (B)?
  Default: A in experiment, B on promotion.
- Which hero figure wins: `Terrain` vs `Riffle` vs `Phosphor`? Test in Phase 2.
- Folder motif: `Drawer` (sliding drawers) vs `Cabinet` (blades) for "problem"
  section? Test both.
- Wardrobe motif: `Rail` only, or also `Lockers`/`Basket`? Start with `Rail`.
- Should hairline replace the existing `HeroDiagram` entirely on `/` later, or
  coexist? Decide in Phase 6.
- Install hairline from npm vs vendor? Prefer npm (`@lucasmarkes/hairline`).

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
