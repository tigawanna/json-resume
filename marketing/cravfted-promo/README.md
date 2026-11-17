# CraVfted promo video

Source project for the 24-second product promo. The composition is plain HTML/CSS with a GSAP timeline, in the same shape OpenMotion uses (`data-composition-id`, `data-start`, `data-duration`, `window.__timelines.main`), so it can be opened in OpenMotion Studio later.

## Files

| Path | Role |
| --- | --- |
| `index.html` | Scene structure and shot metadata |
| `timeline.js` | Paused GSAP master timeline; seek by time |
| `assets/styles.css` | Tokens taken from the app's dark DaisyUI theme |
| `assets/` | Logo, icons, screenshot crops, self-hosted fonts, GSAP |
| `render.mjs` | Frames with Playwright Chromium, encodes with FFmpeg |
| `MOTION.md` | Shot list, brand-token sources, open decisions |
| `dist/cravfted-promo.mp4` | Rendered master (generated) |

## Render

```bash
cd marketing/cravfted-promo
node render.mjs                                  # full MP4
PREVIEW_FRAMES=24,150,260 node render.mjs        # spot-check frames only
```

`render.mjs` resolves Playwright from `apps/web` and writes frames to `frames/` before encoding. It requires the repo's installed `node_modules`, Playwright's Chromium download, and `ffmpeg`/`ffprobe` on `PATH`.

## Iterate

- Copy changes: edit text in `index.html`.
- Colors/type: edit the tokens at the top of `assets/styles.css` (values come from `apps/web/src/styles.css`).
- Timing/pacing: edit positions in `timeline.js`; all calls use absolute seconds.
- Then rerun `node render.mjs`.

To review a single moment, set `PREVIEW_FRAMES` to the frame number (`time × 24`), e.g. frame 150 = 6.25 s.
