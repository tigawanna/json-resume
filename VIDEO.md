# Making the promo video

[projects](https://github.com/nexu-io/openmotion)
(The product promo lives in [`marketing/cravfted-promo/`](marketing/cravfted-promo/). It's plain HTML + CSS + a GSAP timeline — no video editor, no API keys, no per-render cost.

## Watch the current cut

- `marketing/cravfted-promo/dist/cravfted-promo-v2.mp4` — **current cut**: 30 s, 1920×1080, 24 fps, silent. Walks the real flow from "Let's get started" through pasting the job description, tailoring, and export.
- `marketing/cravfted-promo/dist/cravfted-promo.mp4` — first cut, 24 s, kept for reference.

## Render it yourself

From the repo root:

```bash
cd marketing/cravfted-promo
node render.mjs
```

This seeks the timeline frame by frame in Playwright Chromium, writes JPGs to `frames/`, then encodes with FFmpeg into `dist/cravfted-promo.mp4`.

To spot-check single moments without a full render:

```bash
PREVIEW_FRAMES=24,150,260 node render.mjs
```

Frame numbers are `seconds × 24` (frame 150 ≈ 6.25 s).

## Change something

| Want to change…            | Edit                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| On-screen words            | `marketing/cravfted-promo/index.html`                                                     |
| Colors, fonts, spacing     | `marketing/cravfted-promo/assets/styles.css` (tokens come from `apps/web/src/styles.css`) |
| Timing, order, animation   | `marketing/cravfted-promo/timeline.js` (all times are absolute seconds)                   |
| Shot list / open decisions | `marketing/cravfted-promo/MOTION.md`                                                      |

Then rerun `node render.mjs`.

## Assets

All pulled from this repo — `apps/web/public/logo.svg`, `apps/web/public/icons/*.svg`, the dark-theme CSS variables, DM Sans / DM Serif Display, and crops of `apps/web/docs/json_tab.png` + `ai_tab.png`. Copies live under `marketing/cravfted-promo/assets/` so renders don't depend on the app build.

## Currently inferred

The product name (`CraVfted`), all copy, no audio, no URL/CTA, and a 16:9-only master. Tell me what to change and I'll revise and re-render.
