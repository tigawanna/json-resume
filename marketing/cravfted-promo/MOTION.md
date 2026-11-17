# CraVfted — product promo (first cut)

16:9 · 1920×1080 · 24 fps · 24 s · silent (captions carry the story)

Status: **first cut, inferred brief**. Brand colors, fonts, icons and product screenshots come from the repo; copy, pacing and the shot list are inferred from `README.md`.

## Brand kit (source)

| Item | Source | Value |
| --- | --- | --- |
| Logo | `apps/web/public/logo.svg` | green `#06d079` mark |
| Background | dark DaisyUI theme in `apps/web/src/styles.css` | `#121613` |
| Surface | dark theme | `#171c18` / `#1a201c` |
| Foreground | dark theme | `#e8ede9` |
| Primary | dark theme | `#56bc7d` (deep `#267d42`) |
| Muted | dark theme | `#b6c2ba` |
| Accent | dark theme | `#fb923c` (used only on window dots) |
| Sans | app `@theme` | DM Sans |
| Serif | app `@theme` | DM Serif Display |
| Icons | `apps/web/public/icons/*.svg` | pencil-case, doculytics, cabinet (tinted with CSS masks) |

## Shots

| # | Time | Shot | Copy | Motion |
| --- | --- | --- | --- | --- |
| 1 | 0.0–1.6 | Logo lockup on dark grid | CraVfted | mark scales in, wordmark rises, rule draws |
| 2 | 1.6–5.2 | Typographic problem beat | THE OLD WAY / Copy · Paste · Reformat · Repeat / *Formatting is not the work.* / Half an hour lost to margins. Every single time. | chips stagger in, hero rises, chips fade back |
| 3 | 5.2–9.4 | JSON editor screenshot, right | 01 / SOURCE OF TRUTH / Résumé as typed JSON. / One document you actually own. | panel enters from right with slight tilt, caption reveals, green scan box pulses |
| 4 | 9.4–12.6 | Four section cards | 02 / BUILDING BLOCKS / Experience · Skills · Projects · Education / Sections you own. Reuse and remix. / Move a block, keep the layout. | cards stagger up, first and third swap to show remix |
| 5 | 12.6–16.6 | AI assistant screenshot, left | 03 / YOUR MODEL, YOUR KEYS / Tweak it with any LLM. / Same schema in. Same layout out. | panel enters from left, caption reveals, chat bubble outlined |
| 6 | 16.6–20.0 | Two PDF pages aligning | 04 / EXPORT / Same PDF. Every time. / The layout is code, not a document. | pages rotate flat and stack, check pops in |
| 7 | 20.0–24.0 | Outro lockup | CraVfted / Own your data. Own your story. / Résumé as typed JSON. | mark + wordmark rise, rule draws, tagline fades up |

## Transitions

Cross-dissolve, 0.4 s, at every scene boundary. No camera moves; motion lives inside each shot.

## Assets

- `assets/screens/json-tab-crop.png` — crop of `apps/web/docs/json_tab.png` (personal sidebar/footer removed)
- `assets/screens/ai-tab-crop.png` — crop of `apps/web/docs/ai_tab.png` (chat + tool call)
- `assets/logo.svg`, `assets/icons/*.svg` — copied from the app
- `assets/fonts/*.woff2` — self-hosted DM Sans / DM Serif Display latin subsets
- `assets/vendor/gsap.min.js` — timeline driver

## Inferred / needs a decision

- **Product name** is `CraVfted` (taken verbatim from the repo README) — confirm spelling and capitalization.
- **No audio.** Add music and/or TTS narration if you want a voiced cut; nothing was generated because no provider keys were used.
- **No URL or CTA button** in the outro — none was available in the repo.
- **No 9:16 cut** yet; this is the 16:9 master. A vertical version needs a separate layout, not just a crop.
- The screenshots are real product captures with demo résumé content; no names or emails appear in the crops.
