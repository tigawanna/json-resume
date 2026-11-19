# Calc Paye Kenya

A small, single-page rate and tax calculator for salary negotiations. No backend, no router — just a Vite + React SPA under `apps/`.

## Run it

```bash
pnpm --dir apps/rate-calculator dev     # http://localhost:3050
pnpm --dir apps/rate-calculator test
pnpm --dir apps/rate-calculator check-types
pnpm --dir apps/rate-calculator build
```

## What it does

- **One input, any currency**: type an amount, pick the currency it is in (20 options, USD by default) and choose per hour/week/month. The panel immediately shows that amount in your pinned local currencies, with a **+** shortcut to pin another. The breakdown converts everything back into USD per hour, week and month.
- **Hours that make sense**: type hours **per month** or pick the 160/170/180 presets. Hours per week is derived from that and weeks-per-month — edit either one and the other follows.
- **Live rates**: rates come from the free [open.er-api.com](https://open.er-api.com/v6/latest/USD) endpoint, with a bundled fallback table so the tool works offline. Use the refresh button to update.
- **Currency drawer**: the full 20-currency list lives in a shadcn drawer — slides in from the right on wide screens and up from the bottom on narrow ones, with search and pin controls. Pins are saved in `localStorage` and shown in the breakdown.
- **Salaried or contractor**: a top-level toggle changes the whole tax model. Salaried assumes a Kenyan employer withholds PAYE, NSSF, SHIF and the housing levy. Contractor invoices gross, sets aside tax and statutory contributions, and leaves NSSF off by default.
- **KRA tax & take-home**: PAYE is calculated from the bands in `kra-rates.json` on taxable pay — gross less NSSF, SHIF and the housing levy — minus the personal relief. Monthly gross and take-home target sit on the same row; edit either one and the other is solved through the full statutory calculation. The resulting gross is written back into the rate input so the breakdown above updates too.
- **Statutory deductions**: NSSF, SHIF and the Affordable Housing Levy, each toggleable to match a payslip. PAYE always follows, and the employer's NSSF and housing-levy matches plus NITA are shown separately.
- **Top disclaimer, remembered**: a dismissible notice sits above the header. Dismissing it saves the preference in `localStorage` and leaves a red info button in the header to bring it back. The full disclaimer and official KRA links stay at the bottom of the page.
- **Light or dark**: the sun/moon button in the header switches themes. The choice is saved in `localStorage` as `calcpayekenya:theme` and applied by an inline script before the first paint, so reloads and the boot loader stay in the right palette.
- **Official sources and limits**: every figure is explicitly an estimate — not an official tool and not for filing or remittance.

## Updating KRA values

All statutory figures live in [`src/lib/calculator/kra-rates.json`](src/lib/calculator/kra-rates.json). Edit that file and the app picks up the new values:

- `taxYear`, `reviewed` — labels shown in the calculator and disclaimer.
- `paye.personalReliefAnnual` — annual personal relief in KES.
- `paye.bands` — ordered annual bands with a `label`, an annual `upTo` ceiling in KES, and a `rate` from 0 to 1. The last band must use `"upTo": null` for the open-ended top band.
- `nssf.employeeRate`, `nssf.employerRate`, `nssf.lowerEarningsLimit`, `nssf.upperEarningsLimit`.
- `shif.rate`, `shif.minimum`.
- `ahl.employeeRate`, `ahl.employerRate`.
- `nita.monthly`.

### Environment overrides

Environment variables override the shipped JSON at dev/build time. Precedence is:

1. shipped `kra-rates.json`
2. `VITE_KRA_RATES_JSON` — a partial JSON object
3. individual `VITE_KRA_*` variables

```bash
VITE_KRA_RATES_JSON='{"paye":{"personalReliefAnnual":30000},"nssf":{"upperEarningsLimit":120000}}' \
  pnpm --dir apps/rate-calculator dev

VITE_KRA_SHIF_RATE=0.03 VITE_KRA_NITA_MONTHLY=100 \
  pnpm --dir apps/rate-calculator dev
```

Field-level variables: `VITE_KRA_TAX_YEAR`, `VITE_KRA_REVIEWED`, `VITE_KRA_PERSONAL_RELIEF_ANNUAL`, `VITE_KRA_PAYE_BANDS_JSON`, `VITE_KRA_NSSF_EMPLOYEE_RATE`, `VITE_KRA_NSSF_EMPLOYER_RATE`, `VITE_KRA_NSSF_LOWER_LIMIT`, `VITE_KRA_NSSF_UPPER_LIMIT`, `VITE_KRA_SHIF_RATE`, `VITE_KRA_SHIF_MINIMUM`, `VITE_KRA_AHL_EMPLOYEE_RATE`, `VITE_KRA_AHL_EMPLOYER_RATE` and `VITE_KRA_NITA_MONTHLY`. Invalid JSON or values that fail the config checks are ignored with a console warning, and the shipped JSON is used. See [`.env.example`](.env.example).

All calculations live in `src/lib/calculator/` as pure functions and are covered by unit tests. `kra.ts` resolves the shipped JSON plus env overrides, `paye.ts` and `statutory.ts` accept an optional config for testing, and `breakdown.ts` handles hours and periods.

State is coordinated by a Zustand store in `src/store/`: controls, employment mode, deduction toggles, pins, the drawer, disclaimer dismissal, theme and rate fetching all live there. Components are stateless apart from the drawer search input and the media-query subscription — there are no mount/sync effects. Rate fetching is kicked off once from `src/main.tsx`, and persistence happens inside the store actions.

The first rate request is capped at five seconds. Until it settles, the app shows a boot loader (the same markup is inlined in `index.html`, so the very first paint is already dark rather than a white flash).

## Branding and assets

The icon set is generated from `public/icon.png` (currently borrowed from `apps/web/public`) with `pnpm --dir apps/rate-calculator gen:favicons`. `pnpm --dir apps/rate-calculator gen:og` renders `public/og.png` from `public/logo.svg` and the template in `src/components/og/OgImage.tsx`. Both generators live in `scripts/`.

The floating credit badge is [`@tigawanna/credit`](https://www.npmjs.com/package/@tigawanna/credit), mounted in `src/App.tsx` with its stylesheet imported in `src/main.tsx`.

> Defaults reviewed November 2026: PAYE bands unchanged by the Finance Act 2026, NSSF Year 4 from February 2026, SHIF 2.75% and the housing levy 1.5%. Confirm with KRA, NSSF and SHA before relying on any figure.
