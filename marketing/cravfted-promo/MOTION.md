# CraVfted — product promo v2

16:9 · 1920×1080 · 24 fps · 30 s · silent (captions carry the story)

v1 used the old doc screenshots. v2 replaces the middle of the film with the real **job description → tailored résumé** flow captured in `screenshots/` by the user.

## Brand kit (from the repo)

| Item                 | Source                                          | Value                                          |
| -------------------- | ----------------------------------------------- | ---------------------------------------------- |
| Logo                 | `apps/web/public/logo.svg`                      | green mark                                     |
| Background / surface | dark DaisyUI theme in `apps/web/src/styles.css` | `#121613` / `#171c18`                          |
| Foreground / muted   | dark theme                                      | `#e8ede9` / `#b6c2ba`                          |
| Primary              | dark theme                                      | `#56bc7d` (deep `#267d42`)                     |
| Accent               | dark theme                                      | `#fb923c`                                      |
| Fonts                | app `@theme`                                    | DM Sans + DM Serif Display (self-hosted woff2) |

## Shots

| #   | Time      | Shot                     | Copy                                                | Capture                     |
| --- | --------- | ------------------------ | --------------------------------------------------- | --------------------------- |
| 1   | 0.0–1.5   | Logo lockup              | CraVfted                                            | —                           |
| 2   | 1.5–4.5   | Problem typography       | _Formatting is not the work._                       | —                           |
| 3   | 4.5–7.0   | Dashboard                | 01 / START HERE · Let's get crafting.               | `screenshots/…19-59-00.png` |
| 4   | 7.0–10.5  | JD pasted into assistant | 02 / THE BRIEF · Paste the whole posting.           | `…20-01-06.png`             |
| 5   | 10.5–13.5 | Assistant ranks résumés  | 03 / THE MATCH · It finds your closest résumé.      | `…20-16-23.png`             |
| 6   | 13.5–16.5 | AI workbench             | 04 / THE WORKBENCH · Your résumé, still typed JSON. | `…20-18-09.png`             |
| 7   | 16.5–20.5 | Tailoring diff           | 05 / THE TAILOR · One prompt. Every diff visible.   | `…20-21-36.png`             |
| 8   | 20.5–23.5 | Cover letter             | 06 / THE LETTER · A matching letter, same brief.    | `…20-22-38.png`             |
| 9   | 23.5–26.0 | PDF export               | 07 / EXPORT · Same PDF. Every time.                 | CSS illustration            |
| 10  | 26.0–30.0 | Outro                    | Own your data. Own your story.                      | —                           |

Crops of the captures live in `assets/screens/flow/`; originals are untouched in `screenshots/`.

## Open decisions

- Product name is still `CraVfted` from the README — confirm.
- The captures contain the user's own name and résumé details. Crops reduce them but don't fully anonymize; decide whether to blur or use a clean demo account before publishing.
- The JD-before screenshot shows a short stray chat message ("lets get started") — replace with a cleaner capture if you have one.
- No audio, no URL/CTA, and no 9:16 cut yet.
