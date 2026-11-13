# Résumé Credits (grant-only) and Waitlist — Implementation Plan

Status: draft for implementation (revised)
Date: 2026-11-13
Scope: hosted web app (`apps/web`): monthly résumé credits, admin grants, waitlist capture, admin visibility.
Related: `todos/lanidng-page-mmesaging.md`, `docs/paginated-list-pattern.md`, `todos/sync-compaction.md` §5.

---

## 0. Decisions locked

- **No payments, in any form.** No provider, no checkout, no prices, no credit packs, no purchase adapter, no "Pro" plan. Credits are only ever **granted**.
- **1 credit = 1 résumé.** "Résumé" means the `resume` row plus everything that hangs off its `resumeId` (see §1.2). Editing never costs anything.
- **20 credits per calendar month** per eligible account. Use-it-or-lose-it.
- **Admins can grant bonus credits** that carry over across months. That's the only other way to get credits.
- **Eligibility is a single switch** (`CREDIT_POLICY.requireWaitlist`):
  - `false` (default): every signed-in, non-banned hosted account gets 20/month.
  - `true`: only accounts linked to a waitlist entry get 20/month. Use this if signups get abused.
- **Waitlist is demand capture**, not a paywall. It records who wants future paid features. It also serves as the eligibility list if the switch above is flipped.
- **Desktop/self-host builds are never metered.**

### Non-goals

- Payments, plans, tiers, premium invites, token links, purchase adapters, webhooks, and refunds. Section 9 says how to add them later without redoing this work.
- Metering AI. BYOK AI is free to the app.
- Email delivery.

---

## 1. Product model

### 1.1 Nouns

| Term           | Meaning                                                                            |
| -------------- | ---------------------------------------------------------------------------------- |
| Credit         | Permission to create one résumé (and everything scoped to it).                     |
| Monthly bucket | 20 credits each UTC calendar month for eligible accounts. Unused credits expire.   |
| Bonus bucket   | Admin-granted credits. They carry over until spent.                                |
| Waitlist entry | An email that asked for early access. It may be anonymous or linked to an account. |

### 1.2 What "one résumé" covers

The credit is charged once, when a new `resume` row is created. Rows tied to that `resumeId` are covered by that credit and never charged:

- résumé layout/section rows (`resume-layout-rows`)
- AI chat, conversations, and their messages (`resumeAiChat`, `resumeAiConversation`, `resumeAiMessage` via `conversationId`)
- cover letters with that `resumeId`
- application answers with that `resumeId`
- snapshots/event history of that résumé

User-level library rows (experiences, education, skills, projects, contacts, links, summaries, talks), jobs, and assistant skills are **not résumé-scoped**. They are always free. A résumé that references them doesn't make them chargeable.

### 1.3 Charging table

| Action                                                                     | Credits | Notes                                                |
| -------------------------------------------------------------------------- | ------- | ---------------------------------------------------- |
| New résumé (form)                                                          | 1       |                                                      |
| Clone résumé                                                               | 1       | The clone is a new `resume` row.                     |
| Import résumé from JSON                                                    | 1       |                                                      |
| AI `create_resume`, `clone_resume`, `tailor_resume_for_job`, start-for-job | 1 each  | Each creates a new `resume` row.                     |
| Legacy migration import                                                    | 0       | Grandfathered (see §6.4).                            |
| Anything that edits or adds rows under an existing `resumeId`              | 0       |                                                      |
| Library rows, jobs, unlinked cover letters/answers                         | 0       |                                                      |
| Delete a résumé                                                            | 0       | No refund. If needed, an admin grants bonus credits. |

### 1.4 Allocation and spending

- The monthly allocation is **lazy**: it happens on the first wallet read or spend in a new UTC month. There's no cron job, which matters because Vercel Hobby already runs two.
- A new month **replaces** the monthly bucket. The bonus bucket is untouched.
- Spending takes from the monthly bucket first (it expires), then from bonus.
- Normal user actions never take a balance below 0.

---

## 2. Current state (verified)

- Admin = Better Auth role. Admin server functions use `viewerMiddleware` + `adminMiddleware` and `auditAdminAction`.
- `auth-schema.ts` is generated (`pnpm auth:migrate`). **Do not edit.** New tables go in a new schema file.
- Drizzle + Turso/libSQL. Migrations are generated into `apps/web/drizzle/migrations` and never hand-edited.
- Résumés are created **locally first** (TanStack DB) and synced as events. Creation entry points:
  - `routes/_dashboard/resumes/-components/ResumeCreateForm.tsx`
  - `routes/_dashboard/resumes/-components/ResumeList.tsx` (`handleClone`)
  - `routes/_dashboard/resumes/$resumeId/-components/ResumeActionsSheet.tsx`
  - `routes/_dashboard/resumes/-components/ImportResumeJsonDialog.tsx`
  - `routes/_dashboard/-ai/-utils/local-resume-lifecycle-tools.ts`
  - `routes/_dashboard/-ai/-utils/local-start-resume-tool.ts`
  - `routes/_dashboard/-utils/import-from-legacy/resume-import.ts`
  - `data-access-layer/event-sourced/resume/clone-resume.ts`
- `modules/sync/server/project-legacy.server.ts` projects events. Its `deferred` list only handles foreign-key ordering: deferred events are **retried once in the same batch and then stamped as projected regardless**. There is no persistent "hold" state. The earlier plan's "defer until credits exist" would have silently dropped résumés. §6.3 replaces it.
- No waitlist table, route, or form exists. `LandingPricing.tsx` links the Pro CTA to `#faq`. `docs/paginated-list-pattern.md` references a not-yet-existing `AdminWaitlistList`.
- In dark mode, `border-*` is forced transparent. Use `ring-1 ring-base-content/10` and `before:` hairlines.
- The working tree has an unrelated modified `drizzle/migrations/meta/_journal.json`. Don't bundle it.

---

## 3. Data model

New file `apps/web/src/lib/drizzle/scheam/credits-schema.ts`, exported from `scheam/index.ts`. There are three tables.

### 3.1 `credit_wallet` (snapshot, one row per user)

| Column                    | Type                 | Rules                                    |
| ------------------------- | -------------------- | ---------------------------------------- |
| `userId`                  | text PK FK `user.id` | `onDelete: "cascade"`                    |
| `monthlyBalance`          | integer              | >= 0, default 0                          |
| `bonusBalance`            | integer              | >= 0, default 0                          |
| `monthlyPeriodKey`        | text                 | `YYYY-MM` (UTC); null before first grant |
| `createdAt` / `updatedAt` | timestamp_ms         |                                          |

### 3.2 `credit_ledger` (append-only source of truth)

| Column            | Type              | Rules                                                                                                    |
| ----------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| `id`              | text PK           | uuid                                                                                                     |
| `userId`          | text FK `user.id` | cascade                                                                                                  |
| `bucket`          | text              | `monthly` \| `bonus`                                                                                     |
| `type`            | text              | `monthly_grant`, `monthly_expiry`, `admin_grant`, `admin_adjustment`, `resume_spend`, `resume_overdraft` |
| `amount`          | integer           | signed                                                                                                   |
| `periodKey`       | text              | nullable                                                                                                 |
| `resumeId`        | text              | nullable; set for spends/overdrafts. **No FK**, because the résumé can be deleted later.                 |
| `idempotencyKey`  | text              | not null, unique                                                                                         |
| `reason`          | text              | nullable; required for admin rows                                                                        |
| `createdByUserId` | text              | nullable; the admin for admin rows                                                                       |
| `createdAt`       | timestamp_ms      | default now                                                                                              |

Indexes: unique `idempotencyKey`, `(userId, createdAt)`, `(resumeId)`.

Idempotency keys:

- `monthly-grant:<userId>:<YYYY-MM>`
- `monthly-expiry:<userId>:<YYYY-MM>`
- `resume:<resumeId>` (one charge per résumé, ever, whichever bucket it comes from)
- `admin:<uuid>` (generated per admin request)

A spend that splits across buckets doesn't happen with a cost of 1. Keep the single `resume:<resumeId>` key. If the cost ever grows, add `metadata` and keep one row.

### 3.3 `waitlist_entry`

| Column                    | Type              | Rules                                                 |
| ------------------------- | ----------------- | ----------------------------------------------------- |
| `id`                      | text PK           | uuid                                                  |
| `email`                   | text              | not null, normalized (`trim().toLowerCase()`), unique |
| `name`                    | text              | nullable                                              |
| `userId`                  | text FK `user.id` | nullable, `onDelete: "set null"`                      |
| `status`                  | text              | `joined` \| `removed`; default `joined`               |
| `source`                  | text              | `landing` \| `waitlist-page` \| `admin`               |
| `consentAt`               | timestamp_ms      | not null                                              |
| `claimedAt`               | timestamp_ms      | nullable                                              |
| `notes`                   | text              | admin-only                                            |
| `createdAt` / `updatedAt` | timestamp_ms      |                                                       |

Indexes: unique `email`, `(status, createdAt)`, `(userId)`.

On account deletion, delete linked waitlist entries in the delete flow (privacy), rather than relying on `set null`.

Removed from the earlier draft: `user_plan`, `premium_invite`, `credit_reservation`, the purchase tables, and the `invited`/`active` statuses. Follow the timestamp/default patterns in `saved-project-schema.ts`.

---

## 4. Config

`apps/web/src/config/credits.ts` (shared, client-safe):

```ts
export const CREDIT_POLICY = {
  monthlyCredits: 20,
  resumeCost: 1,
  requireWaitlist: false,
} as const;
```

Flags:

- `CREDITS_ENABLED` in `lib/env/server-env.ts`, plus `VITE_CREDITS_ENABLED` in `lib/env/client-env.ts`. Both default to off until Phase 2 ships.
- `VITE_DESKTOP === "true"` always bypasses.

---

## 5. Server modules

```
apps/web/src/modules/credits/
  credits-schemas.ts        # zod inputs
  wallet.server.ts          # ensureWallet, ensureMonthlyAllocation, spendResumeCredit, adminGrant/adjust
  eligibility.server.ts     # isEligibleForMonthly(user)
  credits.functions.ts      # getMyCredits, getMyLedger, checkResumeCredit, admin grant/adjust, admin ledger
apps/web/src/modules/waitlist/
  waitlist.server.ts        # join, claim, list, update
  waitlist.functions.ts     # public join + admin list/link/remove/export
apps/web/src/data-access-layer/credits/credits-query-options.ts
apps/web/src/data-access-layer/waitlist/waitlist-query-options.ts
```

### 5.1 `isEligibleForMonthly(user)`

```ts
if (user.banned) return false;
if (!CREDIT_POLICY.requireWaitlist) return true;
return hasJoinedWaitlistEntry(user.id);
```

### 5.2 `ensureMonthlyAllocation({ userId, now })`, in one transaction

1. Insert the wallet if it's missing (all zeros).
2. Compute `periodKey`. If it equals `wallet.monthlyPeriodKey`, return.
3. If `monthlyBalance > 0`, write `monthly_expiry` (−balance).
4. If eligible, write `monthly_grant` (+20).
5. Set `monthlyBalance` (20 or 0) and `monthlyPeriodKey`.
6. On a unique-key conflict (a concurrent request), re-read and return.

### 5.3 `spendResumeCredit({ userId, resumeId })`

1. `ensureMonthlyAllocation`.
2. If a ledger row with `resume:<resumeId>` exists, return `{ status: "already-charged" }`. This makes replay, rebuild, and retry safe.
3. If `monthly + bonus < 1`, throw `InsufficientCreditsError` (`code: "INSUFFICIENT_CREDITS"`, `available`).
4. Debit monthly, else bonus. Write `resume_spend` and update the wallet.

### 5.4 `checkResumeCredit()` (server function, client UX)

It runs `ensureMonthlyAllocation` for the viewer and returns `{ available, monthly, bonus, resetsAt }`. It doesn't consume anything.

### 5.5 Admin

- `adminGrantCredits({ userId, amount > 0, reason })` adds to the **bonus** bucket and writes `admin_grant`, wrapped in `auditAdminAction`.
- `adminAdjustCredits({ userId, amount (signed), bucket, reason })` rejects any change that would take a bucket below 0, and is audited.
- `adminGetUserCredits({ userId })` returns the wallet plus a paginated ledger.
- Banned users can't receive grants. Return a typed error.

---

## 6. Enforcement

### 6.1 Principle

There's no money at stake, so enforcement is **"block in the client, record honestly on the server."** The server never drops or holds a user's synced résumé. A modified client that bypasses the guard produces an overdraft row the admin can see. It does not lose data.

### 6.2 Client guard

`apps/web/src/data-access-layer/event-sourced/resume/resume-credit-guard.ts`:

```ts
export async function ensureResumeCredit(input: {
  action: "create" | "clone" | "import" | "tailor";
}): Promise<
  { ok: true } | { ok: false; reason: "insufficient"; available: number; resetsAt: string }
>;
```

- If credits are disabled or this is desktop, return `ok`.
- If offline or the check errors, allow the write. The server records it (fail open, because the data is the user's).
- Call it before **every** entry point in §2. That includes the shared `clone-resume.ts`, so every clone caller is covered.
- On failure, show a dialog: "You've used your 20 résumés this month. Credits reset on {date}. Editing existing résumés is always free." It links to `/credits`.
- AI tools return a tool error that the assistant can relay, without writing local data.

### 6.3 Server projection

In `project-legacy.server.ts`, when a `resume` **insert** event projects a row id that doesn't exist yet:

1. Call `spendResumeCredit`. `already-charged` lets the event continue.
2. On `InsufficientCreditsError`, **still project**, and write a `resume_overdraft` ledger row (`amount: 0`, key `resume:<resumeId>`) so it's never charged later. Log `credits.overdraft`.
3. Updates and deletes are never charged. Child rows are never charged.
4. Skip all of this when credits are disabled.

Tests must cover `rebuildAllEventLogs` / `rebuildUserEventLog`, which should produce no second charge.

This deliberately replaces the earlier "defer" design, which the current projector can't support. Revisit hard enforcement only if paid credits arrive (§9).

### 6.4 Legacy import

The legacy migration import is free. Pass `{ grandfathered: true }` from `import-from-legacy/resume-import.ts`. The guard skips it, and the projector writes the `resume:<id>` key with `amount: 0` and the reason `legacy-import`. To mark these events, have the projector skip charging résumé inserts whose `createdAt` is before the credits launch timestamp (`CREDITS_START_AT` env). That also grandfathers every existing résumé on rebuild.

---

## 7. UI

### 7.1 Dashboard credits card

`routes/_dashboard/-components/CreditBalanceCard.tsx` shows "{n} résumé credits left", the monthly reset date, and bonus credits if there are any, with a link to `/credits`. Add `data-test="dashboard-credits-card"`.

### 7.2 `/credits` page

`routes/_dashboard/credits/index.tsx` with `-components/`:

- Summary: available, monthly (x / 20), bonus, and reset date.
- "How credits work": 1 credit = 1 résumé and everything attached to it. Editing is free, library entries are free, and BYOK AI is free. 20 per month, unused monthly credits reset, admin bonus credits carry over.
- Ledger: a simple paginated table.
- Waitlist card (only if not joined): "Want more later? Join the waitlist."
- No prices, no buy buttons, no packs.

### 7.3 Résumé list states

- 0 credits and existing résumés: everything is editable. The "New résumé" button opens the out-of-credits dialog.
- 0 credits and no résumés: an empty state with the reset date.

### 7.4 Waitlist

- `LandingPricing.tsx`: the Pro CTA opens `WaitlistJoinDialog` (email, optional name, consent, honeypot). The email is prefilled when signed in.
- A `/waitlist` public route uses the same form.
- Success copy: "You're on the list. We'll reach out when paid plans open." Don't promise credits there, because everyone gets 20/month.
- Add `data-test="waitlist-join-form" | "waitlist-join-submit" | "waitlist-join-success"`.
- `joinWaitlist`: honeypot, origin check (`isAllowedOrigin`), normalized-email upsert, the same response for new and existing emails, and a link to the session user if present. Don't log raw emails.
- `claimWaitlistForUser` runs on sign-up and on dashboard load (idempotent). It links by email only when `userId` is null.

### 7.5 Admin

- `/_dashboard/admin/waitlist/`: `AdminWaitlistList` per `docs/paginated-list-pattern.md` (search, status filter, has-account filter, pagination). Row actions: link/unlink account, remove/restore, copy email, open user. Add CSV export (audited).
- Admin home: waitlist count and linked count. Also show credits stats: résumés created this month, users at 0, and overdraft count.
- `AdminUsersView`: add a Credits column linking to `/_dashboard/admin/users/$userId`.
- Admin user detail: wallet, ledger, a grant-bonus form, and an adjust form (reason required). Every action is audited.

Conventions: shadcn UI, DaisyUI only for theme/buttons, `ring-1` surfaces, `data-test` on interactive elements, no `useMemo`/`useCallback`, `queryOptions` + `useSuspenseQuery`, `unknown` in catch blocks, mutations with `meta.invalidates`.

---

## 8. Phases

**Phase 0: schema and config**

- [ ] `credits-schema.ts` (wallet, ledger, waitlist), `db:generate`, review, `db:migrate`.
- [ ] `config/credits.ts`, env flags, and `CREDITS_START_AT`.

**Phase 1: waitlist (shippable alone, credits flag off)**

- [ ] `joinWaitlist`, landing dialog, `/waitlist`.
- [ ] `claimWaitlistForUser`.
- [ ] Admin waitlist list, admin home card, link/remove/export actions.
- [ ] Tests: normalization, duplicate joins, claim, list pagination.

**Phase 2: wallet and allocation (visible, not yet enforced)**

- [ ] `ensureMonthlyAllocation`, `spendResumeCredit`, admin grant/adjust.
- [ ] Dashboard card, `/credits` page, admin user detail.
- [ ] Tests: one grant per month, expiry, bonus carryover, concurrent allocation, adjust bounds, banned users.

**Phase 3: enforcement**

- [ ] Client guard at every creation entry point.
- [ ] Projection charge plus overdraft recording, and `CREDITS_START_AT` grandfathering.
- [ ] Out-of-credits dialog and AI tool error.
- [ ] Tests: every entry point blocks at 0, edits are free at 0, child rows are never charged, rebuilds don't double-charge, overdrafts are recorded instead of dropped.
- [ ] Turn on `CREDITS_ENABLED`.

---

## 9. Adding payments later (not now)

The ledger already has buckets and typed rows. Paid credits would add a `purchased` bucket and a `purchase_grant` type, a provider webhook that writes ledger rows idempotently, and, only then, a decision on hard projection enforcement. Plans and invites can come back as their own tables if needed. Nothing in this iteration has to change shape for that.

---

## 10. Observability

- evlog events: `waitlist.joined` (entry id, source), `credits.allocated`, `credits.spent`, `credits.denied` (client), `credits.overdraft` (server), and `credits.admin_grant`.
- Don't report `INSUFFICIENT_CREDITS` to Urgentry. It's expected.

---

## 11. Open questions

1. Should eligibility start as `requireWaitlist: false` (everyone gets 20)? This is the recommended default.
2. Should an account's first month be prorated or the full 20? The recommendation is the full 20.
3. Should cover letters and application answers _not_ linked to a résumé stay free forever? The recommendation is yes.
4. Legal copy: credits have no cash value and monthly credits expire. Do a short terms pass before launch.

---

## 12. Acceptance criteria

- [ ] Each eligible account gets exactly 20 monthly credits per UTC month, lazily and idempotently, and unused ones expire.
- [ ] Creating, cloning, importing, or AI-creating a résumé costs exactly 1 credit, and the client blocks at 0.
- [ ] Nothing under an existing `resumeId`, nothing in the library, and no job ever costs a credit.
- [ ] The server never drops a synced résumé. It charges once per `resumeId` or records an overdraft, and rebuilds never double-charge.
- [ ] Existing résumés (created before `CREDITS_START_AT`) and legacy imports are free.
- [ ] Admins can grant and adjust bonus credits with a reason, and the action is audited.
- [ ] Visitors can join the waitlist, and admins can list, search, link, remove, and export entries.
- [ ] No payment, pricing, plan, or invite code or tables ship.
- [ ] Typecheck, tests, and lint pass on touched files. No auth schema or migration SQL is hand-edited.
