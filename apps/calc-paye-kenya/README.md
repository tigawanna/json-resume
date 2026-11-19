# Calc Paye Kenya (Solid 2 port)

A prerendered Solid 2 + start-mode port of the React calculator. Same features — currency conversion, editable hours, salaried/contractor toggle, KRA tax model, configurable rates, disclaimer and theme — with Solid primitives instead of Zustand and Terracotta headless components instead of shadcn/ui.

## Run it

```bash
pnpm --dir apps/calc-paye-kenya dev        # http://localhost:3060
pnpm --dir apps/calc-paye-kenya test
pnpm --dir apps/calc-paye-kenya check-types
pnpm --dir apps/calc-paye-kenya build      # prerenders / into dist/client
pnpm --dir apps/calc-paye-kenya preview
```

## What is different from the React app

- **Solid 2 start mode.** `vite.config.ts` enables `solid({ start: true, ssr: true, serverFunctions: true })` and the `prerender-crawler` plugin, so `vite build` renders the page to static HTML in `dist/client`. `src/Document.tsx` replaces `index.html`.
- **Metadata at build time.** `Title` and `Meta` from `@solidjs/meta` put the title, description, Open Graph and Twitter tags into the prerendered `<head>`. The OG image is shipped as `public/og.png`.
- **No Zustand.** `src/state/calculator.tsx` is a context provider built from `createSignal`, `createStore`, `createMemo` and `createEffect`. `onSettled` restores pins, disclaimer and theme from `localStorage` and kicks off the rate fetch after hydration.
- **Terracotta primitives.** Buttons, switches, tooltips, the disclosure and the currency drawer come from `terracotta/*`. `src/styles/terracotta.css` is the shadcn-like skin driven by the `tc-*` state attributes Terracotta writes to the DOM.
- **SSR-safe boot.** The saved theme is applied by an inline script in `Document.tsx` before first paint, so prerendered HTML and client hydration agree. No boot loader is needed because the useful content is already in the HTML.
- **Credit.** `@tigawanna/credit` is React-only, so the badge is reproduced as a styled footer link in `src/components/app/Credit.tsx` pointing to the package on npm.

## Configuration and assets

KRA values still come from `src/lib/calculator/kra-rates.json`, with `VITE_KRA_*` environment overrides documented in `.env.example`. See the React app's README for the full list of fields.

```bash
pnpm --dir apps/calc-paye-kenya gen:favicons  # from public/icon.png
pnpm --dir apps/calc-paye-kenya gen:og        # from public/logo.svg + scripts/OgImage.tsx
```

The pure calculation functions are shared with the React version and covered by 24 Vitest cases.
