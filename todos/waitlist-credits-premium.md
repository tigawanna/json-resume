# Waitlist, Credits, and Premium — Implementation Plan

Status: draft for implementation
Date: 2026-11-13
Scope: hosted web app (`apps/web`), admin waitlist, monthly credit allocation, resume credits, premium invites, injectable purchase surface.
Related: `todos/lanidng-page-mmesaging.md`, `docs/paginated-list-pattern.md`, `todos/sync-compaction.md` §5.

---

## 0. Decisions locked in this pass

These came from the product discussion and override earlier assumptions:

- **No payment provider yet.** We do not add Stripe, Polar, or Lemon Squeezy until demand is visible. The purchase path is an injectable surface with a disabled/manual adapter for now.
- **The only live qualification check is waitlist membership.** A signed-in user whose waitlist entry is linked gets monthly credits automatically.
- **1 credit = 1 résumé and its related collections.** Creating a résumé consumes one credit. Editing that résumé, or adding/editing its experiences, education, skills, projects, contacts, links, summaries, notes, etc., consumes nothing extra.
- **Monthly credits go to linked accounts only.** An anonymous waitlist email gets nothing until it is tied to a signed-in account. This prevents fake-email farming.
- **No payment tables until a provider exists.** We reserve the adapter interface and the UI state, but do not ship unused checkout/webhook tables.

### Non-goals for this iteration

- Checkout, invoices, tax handling, subscriptions, refunds, webhooks.
- Usage-based AI billing. BYOK AI stays free to the user and is not metered by app credits.
- Team/organization billing.
- Email delivery. There is no transactional email dependency today; invite links and waitlist confirmations are copyable in the admin UI until one is added.

---

## 1. Product model

### 1.1 Nouns

| Term              | Meaning                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Waitlist entry    | An email that asked for early access. May be anonymous or linked to an account.                                                |
| Linked account    | A waitlist entry whose normalized email matches a signed-in user.                                                              |
| Credit            | One résumé slot. It covers the résumé row and every child row attached to it.                                                  |
| Monthly credits   | Credits refreshed each calendar month for waitlist/pro users. Use-it-or-lose-it.                                               |
| Purchased credits | Credits from an admin grant or (later) a purchase. They carry over.                                                            |
| Plan              | `free` or `pro`. `pro` is currently invite-only; it raises the monthly allocation and is the hook for future premium features. |
| Premium invite    | An admin-created invitation that grants a plan and/or credits to an email or existing user.                                    |
| Entitlement       | The resolved answer to “what can this user do now?”: plan, premium-until, monthly allowance, wallet balances.                  |

`admin` remains a Better Auth role, not a plan. Admin users see the admin UI; their personal plan is resolved like everyone else’s (with an optional admin override).

### 1.2 What consumes a credit

| Action                                                                                      | Credits                        | Notes                                                         |
| ------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------- |
| Create a résumé from the “New résumé” form                                                  | 1                              | Primary sink.                                                 |
| Clone a résumé                                                                              | 1                              | A clone is a new résumé row.                                  |
| Import a résumé from JSON                                                                   | 1                              | Creates a new résumé and child rows.                          |
| AI `create_resume`, `clone_resume`, `tailor_resume_for_job`, `start_resume_for_job`         | 1 each                         | These already create a new résumé row.                        |
| Legacy migration import of a résumé                                                         | 0 for the first migration pass | Grandfather existing users; see §8.4.                         |
| Edit an existing résumé                                                                     | 0                              | Includes editing layout, sections, and child collections.     |
| Add/edit/delete experiences, education, skills, projects, contacts, links, summaries, notes | 0                              | Covered by the résumé credit.                                 |
| Create/edit a cover letter or application answer                                            | 0                              | Included for now; revisit if they become standalone products. |
| Delete a résumé                                                                             | 0                              | No automatic refund. Admin can adjust manually.               |
| BYOK AI on an existing résumé                                                               | 0                              | The user pays their model provider directly.                  |

### 1.3 Monthly allocation rules

- The allocation is resolved from the user’s plan and waitlist membership:
  - `free`: 0 per month. `FREE_SIGNUP_CREDITS`, if enabled, is a **one-time** grant into the purchased bucket when the wallet is first created, not a monthly grant.
  - linked waitlist: `WAITLIST_MONTHLY_CREDITS` per month.
  - `pro`: `PRO_MONTHLY_CREDITS` per month, or a per-user override.
  - If a user is both waitlisted and pro, use the larger of the two unless a per-user override exists.
- A new calendar month **replaces** the monthly bucket; unused monthly credits expire. Purchased/admin credits are a separate bucket and carry over.
- The first allocation for a period is lazy: it happens when the wallet is read or when a credit is about to be spent. This avoids depending on a cron job and works on Vercel Hobby, which limits cron jobs.
- A nightly/admin catch-up run is optional. If added, it reuses the same idempotent `ensureMonthlyAllocation` function.

### 1.4 Spending order

Spend the **monthly** bucket first (it expires), then **purchased**. Never let a balance go negative through normal user actions. Admin adjustments are the only way to create a deliberate correction.

### 1.5 Premium features at launch

The launch “premium feature” is **more résumé capacity**:

- Free users can keep and edit existing résumés but need credits to create new ones.
- Waitlist users get a monthly batch of résumé credits.
- Pro users get a larger batch and are the audience for future premium surfaces.

The entitlement helper is generic so future premium features can be added without redesigning the wallet:

```ts
type PremiumFeature = "create-resume" | "advanced-agent" | "premium-template";

type FeatureCheck =
  | { kind: "free" }
  | { kind: "plan"; plan: "pro" }
  | { kind: "credits"; cost: number };

const FEATURE_RULES: Record<PremiumFeature, FeatureCheck> = {
  "create-resume": { kind: "credits", cost: 1 },
  "advanced-agent": { kind: "plan", plan: "pro" },
  "premium-template": { kind: "credits", cost: 1 },
};
```

At launch only `create-resume` is wired. The other entries are placeholders, not hidden features.

---

## 2. Current state and constraints

Verified in the repo:

- Better Auth uses the admin plugin; admin access is `viewer.user.role === "admin"` in `apps/web/src/routes/_dashboard/admin/route.tsx` and `modules/admin/admin.functions.ts`.
- Auth schema is generated (`apps/web/src/lib/drizzle/scheam/auth-schema.ts`, generated by `pnpm auth:migrate`). **Do not hand-edit it.** New state goes in a separate schema file.
- Drizzle uses Turso/libSQL (`drizzle.config.ts`, `lib/drizzle/client.ts`). Migrations are generated into `apps/web/drizzle/migrations` and must not be hand-edited.
- Admin server functions use `viewerMiddleware` plus an `adminMiddleware` that throws on non-admin. Admin mutations are wrapped in `auditAdminAction`.
- The landing page CTA currently links to `#faq` for Pro (`LandingPricing.tsx`). There is no waitlist form, table, route, or server function.
- `docs/paginated-list-pattern.md` describes an `AdminWaitlistList` and `/_dashboard/admin/waitlist/` that do not exist yet. This plan creates both and makes the doc’s reference implementation real.
- Résumé creation happens **locally first** through TanStack DB collections. Entry points found:
  - `routes/_dashboard/resumes/-components/ResumeCreateForm.tsx`
  - `routes/_dashboard/resumes/-components/ResumeList.tsx` (`handleClone`)
  - `routes/_dashboard/resumes/$resumeId/-components/ResumeActionsSheet.tsx`
  - `routes/_dashboard/resumes/-components/ImportResumeJsonDialog.tsx`
  - `routes/_dashboard/-ai/-utils/local-resume-lifecycle-tools.ts`
  - `routes/_dashboard/-ai/-utils/local-start-resume-tool.ts`
  - `routes/_dashboard/-utils/import-from-legacy/resume-import.ts`
  - `data-access-layer/event-sourced/resume/clone-resume.ts` (the shared clone helper)
- The server projects synced events in `modules/sync/server/project-legacy.server.ts`; `resume` is a projectable collection. This is the server-authoritative place to enforce credits for synced data.
- Vercel cron already has two jobs (`apps/web/vercel.json`): `project-sync-events` and `squash-sync-events`. Avoid adding a third cron on Hobby; use lazy allocation and an admin-triggered catch-up.
- Global dark-mode CSS forces `border-color: transparent !important` for `.dark *`. New UI must use `ring-1 ring-base-content/10` and `before:` hairline dividers, matching the settings/profile work.
- Working tree already contains unrelated in-progress changes, including a modified `drizzle/migrations/meta/_journal.json`. Do not bundle those into this feature.

---

## 3. Data model

Create one new schema file:

`apps/web/src/lib/drizzle/scheam/premium-schema.ts`

Export it from `apps/web/src/lib/drizzle/scheam/index.ts`:

```ts
export * from "./premium-schema";
```

Do not add fields to `auth-schema.ts`. Relations can reference `user` from the generated file without editing it.

### 3.1 `waitlist_entry`

| Column            | Type              | Rules                                                                                                                       |
| ----------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`              | text PK           | `crypto.randomUUID()`                                                                                                       |
| `email`           | text              | not null, stored lowercase/trimmed, unique                                                                                  |
| `emailNormalized` | text              | optional explicit column if we want the unique index to be unambiguous; otherwise `email` is always normalized before write |
| `name`            | text              | nullable                                                                                                                    |
| `userId`          | text FK `user.id` | nullable, `onDelete: "cascade"` so a linked entry is removed with the account; see §9                                       |
| `status`          | text              | `joined`, `invited`, `active`, `removed`; default `joined`                                                                  |
| `source`          | text              | `landing`, `pricing`, `direct`, `admin`, `import`; default `landing`                                                        |
| `consentAt`       | timestamp_ms      | not null                                                                                                                    |
| `claimedAt`       | timestamp_ms      | nullable, set when linked to an account                                                                                     |
| `invitedAt`       | timestamp_ms      | nullable                                                                                                                    |
| `activatedAt`     | timestamp_ms      | nullable                                                                                                                    |
| `removedAt`       | timestamp_ms      | nullable                                                                                                                    |
| `notes`           | text              | admin-only note                                                                                                             |
| `createdAt`       | timestamp_ms      | default now                                                                                                                 |
| `updatedAt`       | timestamp_ms      | `$onUpdate`                                                                                                                 |

Indexes:

- `uniqueIndex("waitlist_entry_email_uidx").on(email)`
- `index("waitlist_entry_status_created_idx").on(status, createdAt)`
- `index("waitlist_entry_userId_idx").on(userId)`

### 3.2 `user_plan`

| Column                    | Type                 | Rules                                                 |
| ------------------------- | -------------------- | ----------------------------------------------------- |
| `userId`                  | text PK FK `user.id` | `onDelete: "cascade"`                                 |
| `tier`                    | text                 | `free` or `pro`, default `free`                       |
| `source`                  | text                 | `default`, `admin`, `invite`, `waitlist`, `import`    |
| `status`                  | text                 | `active`, `canceled`, `expired`; default `active`     |
| `premiumUntil`            | timestamp_ms         | nullable; null means no time limit while `tier = pro` |
| `monthlyCreditOverride`   | integer              | nullable                                              |
| `note`                    | text                 | nullable                                              |
| `createdAt` / `updatedAt` | timestamp_ms         |                                                       |

Indexes: `index("user_plan_tier_status_idx").on(tier, status)`.

### 3.3 `premium_invite`

| Column                    | Type              | Rules                                                             |
| ------------------------- | ----------------- | ----------------------------------------------------------------- |
| `id`                      | text PK           | uuid                                                              |
| `email`                   | text              | not null, normalized                                              |
| `userId`                  | text FK `user.id` | nullable, set when an admin targets an existing account           |
| `tokenHash`               | text              | unique, SHA-256 of a random 32-byte token; raw token never stored |
| `plan`                    | text              | `pro`                                                             |
| `monthlyCredits`          | integer           | 0 means use the plan default                                      |
| `oneTimeCredits`          | integer           | granted to the purchased bucket on acceptance                     |
| `premiumDays`             | integer           | nullable; duration of the pro plan                                |
| `status`                  | text              | `pending`, `accepted`, `expired`, `revoked`; default `pending`    |
| `createdByUserId`         | text FK `user.id` | admin who created it                                              |
| `acceptedByUserId`        | text FK `user.id` | nullable                                                          |
| `expiresAt`               | timestamp_ms      | required                                                          |
| `acceptedAt`              | timestamp_ms      | nullable                                                          |
| `note`                    | text              | nullable                                                          |
| `createdAt` / `updatedAt` | timestamp_ms      |                                                                   |

Indexes:

- `uniqueIndex("premium_invite_token_hash_uidx").on(tokenHash)`
- `index("premium_invite_email_idx").on(email)`
- `index("premium_invite_status_created_idx").on(status, createdAt)`

### 3.4 `credit_wallet`

| Column                    | Type                 | Rules                                        |
| ------------------------- | -------------------- | -------------------------------------------- |
| `userId`                  | text PK FK `user.id` | `onDelete: "cascade"`                        |
| `monthlyBalance`          | integer              | >= 0, default 0                              |
| `purchasedBalance`        | integer              | >= 0, default 0                              |
| `monthlyPeriodKey`        | text                 | e.g. `2026-11`; null before first allocation |
| `monthlyAllowance`        | integer              | the allowance applied for the current period |
| `lifetimeGranted`         | integer              | monthly + admin + purchase                   |
| `lifetimeSpent`           | integer              |                                              |
| `createdAt` / `updatedAt` | timestamp_ms         |                                              |

### 3.5 `credit_ledger`

The ledger is the source of truth. Wallet balances are a snapshot kept in the same transaction.

| Column                  | Type              | Rules                                                                                                                            |
| ----------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | text PK           | uuid                                                                                                                             |
| `userId`                | text FK `user.id` | `onDelete: "cascade"`                                                                                                            |
| `bucket`                | text              | `monthly`, `purchased`, `adjustment`                                                                                             |
| `type`                  | text              | `signup_grant`, `monthly_grant`, `monthly_expiry`, `admin_grant`, `admin_adjustment`, `resume_spend`, `refund`, `purchase_grant` |
| `amount`                | integer           | signed; positive credit, negative debit                                                                                          |
| `balanceAfterMonthly`   | integer           | snapshot after this row                                                                                                          |
| `balanceAfterPurchased` | integer           | snapshot after this row                                                                                                          |
| `periodKey`             | text              | nullable; e.g. `2026-11`                                                                                                         |
| `idempotencyKey`        | text              | not null, **unique**; `monthly-grant:<userId>:<period>`, `resume-spend:<resumeId>:<bucket>`, `invite:<inviteId>`, etc.           |
| `referenceType`         | text              | `resume`, `invite`, `admin`, `monthly`, `purchase`                                                                               |
| `referenceId`           | text              | nullable                                                                                                                         |
| `reason`                | text              | human-readable, shown to admins/users                                                                                            |
| `metadata`              | text              | JSON string, nullable                                                                                                            |
| `createdByUserId`       | text FK `user.id` | nullable, set for admin actions                                                                                                  |
| `createdAt`             | timestamp_ms      | default now                                                                                                                      |

Indexes:

- `uniqueIndex("credit_ledger_idempotency_uidx").on(idempotencyKey)`
- `index("credit_ledger_user_created_idx").on(userId, createdAt)`
- `index("credit_ledger_reference_idx").on(referenceType, referenceId)`

### 3.6 `credit_reservation` (optional, only if spending becomes async)

Not needed for the resume-slot model at launch, because resume creation is a fast synchronous action. Add it only if a future premium feature streams or runs long enough that a user could double-spend in parallel. The plan reserves the name, not the table.

### 3.7 Deferred until a payment provider exists

- `credit_purchase`
- `payment_webhook_event`

The adapter in §7 is the seam. When a provider is chosen, add these tables and a webhook route without changing the wallet/ledger API.

### 3.8 Schema sketch

```ts
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

const nowMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const waitlistEntry = sqliteTable(
  "waitlist_entry",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    name: text("name"),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    status: text("status").default("joined").notNull(),
    source: text("source").default("landing").notNull(),
    consentAt: integer("consent_at", { mode: "timestamp_ms" }).notNull(),
    claimedAt: integer("claimed_at", { mode: "timestamp_ms" }),
    invitedAt: integer("invited_at", { mode: "timestamp_ms" }),
    activatedAt: integer("activated_at", { mode: "timestamp_ms" }),
    removedAt: integer("removed_at", { mode: "timestamp_ms" }),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(nowMs).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("waitlist_entry_email_uidx").on(table.email),
    index("waitlist_entry_status_created_idx").on(table.status, table.createdAt),
    index("waitlist_entry_userId_idx").on(table.userId),
  ],
);
```

Follow the same timestamp/default patterns as `saved-project-schema.ts`.

---

## 4. Shared config

Create `apps/web/src/config/premium.ts` (plain shared module, safe for client and server):

```ts
export const CREDIT_POLICY = {
  freeSignupCredits: 1,
  waitlistMonthlyCredits: 10,
  proMonthlyCredits: 25,
  monthlyPeriodTimeZone: "UTC",
  purchaseEnabled: false,
} as const;

export const CREDIT_PACKAGES = [
  { id: "starter", label: "Starter", credits: 10, priceCents: 500, currency: "USD" },
  { id: "builder", label: "Builder", credits: 30, priceCents: 1200, currency: "USD" },
] as const;

export type CreditPackageId = (typeof CREDIT_PACKAGES)[number]["id"];

export const PREMIUM_FEATURES = {
  "create-resume": { kind: "credits", cost: 1 },
  "advanced-agent": { kind: "plan", plan: "pro" },
  "premium-template": { kind: "credits", cost: 1 },
} as const;
```

Numbers are placeholders. They must be tunable in one place, not scattered through components.

Add a feature flag:

- Server: `PREMIUM_ENABLED` in `lib/env/server-env.ts` (optional, default enabled on the hosted web build).
- Client: `VITE_PREMIUM_ENABLED` in `lib/env/client-env.ts` for hiding the credits UI in desktop/self-host builds.
- `VITE_DESKTOP === "true"` always bypasses gates.

---

## 5. Server modules and file layout

Follow the repo’s folder grouping rule. Do not scatter new files into `utils/` or `lib/`.

```
apps/web/src/modules/premium/
  premium-schemas.ts          # zod inputs shared by server functions
  waitlist.server.ts          # join, claim, list, update
  waitlist.functions.ts       # public join + admin list/update
  credits.server.ts           # wallet, ledger, grant, spend, adjustments
  credits.functions.ts        # wallet summary, ledger page, admin grant/adjust
  allocation.server.ts        # ensureMonthlyAllocation, catch-up
  plans.server.ts             # getPlan, setPlan, resolveAllowance
  invites.server.ts           # create, accept, revoke, resolve
  invites.functions.ts
  access.server.ts            # assertFeatureAccess, getEntitlements
  purchase/
    adapter.ts                # CreditPurchaseAdapter interface + types
    manual-adapter.ts         # disabled/manual adapter used now
    index.ts                  # getPurchaseAdapter()
  waitlist-query-options.ts   # or data-access-layer/premium/*
```

Data access:

```
apps/web/src/data-access-layer/premium/
  wallet-query-options.ts
  waitlist-query-options.ts
  invites-query-options.ts
```

Routes:

```
apps/web/src/routes/waitlist/index.tsx
apps/web/src/routes/invite/$token/index.tsx
apps/web/src/routes/_dashboard/credits/index.tsx
apps/web/src/routes/_dashboard/credits/-components/...
apps/web/src/routes/_dashboard/admin/waitlist/index.tsx
apps/web/src/routes/_dashboard/admin/waitlist/-components/...
apps/web/src/routes/_dashboard/admin/users/$userId/index.tsx
apps/web/src/routes/_dashboard/admin/users/$userId/-components/...
```

Feature components:

```
apps/web/src/features/waitlist/components/AdminWaitlistList.tsx
apps/web/src/features/waitlist/components/WaitlistJoinForm.tsx
apps/web/src/features/credits/components/CreditBalanceCard.tsx
apps/web/src/features/credits/components/CreditLedgerTable.tsx
apps/web/src/features/credits/components/CreditPacks.tsx
apps/web/src/features/premium/components/PremiumGate.tsx
```

This makes the reference path in `docs/paginated-list-pattern.md` real.

---

## 6. Server behavior

### 6.1 Join the waitlist

`joinWaitlist` is a public `createServerFn({ method: "POST" })`.

Input:

```ts
const joinWaitlistSchema = z.object({
  email: z.email().max(320),
  name: z.string().trim().max(120).optional(),
  source: z.enum(["landing", "pricing", "direct"]).default("landing"),
  consent: z.literal(true),
  honeypot: z.string().max(0).optional(),
});
```

Behavior:

1. Reject a filled honeypot.
2. Normalize email: `trim().toLowerCase()`.
3. If the current request has a session, use its user; otherwise stay anonymous.
4. Upsert by normalized email:
   - If a row exists, return `{ status: "already-joined" }` (same response shape as success; do not leak whether the email was new).
   - If new, insert with `status: "joined"`, `consentAt: now`, `source`.
   - If signed in and the row has no `userId`, link it and set `claimedAt`/`activatedAt`.
5. Return `{ status: "joined" }` and a short message.
6. Log an evlog event `waitlist.joined` with source and whether it was linked. Do not log the email in plaintext if the logging policy avoids PII; log a hash or the entry id.

Rate limiting: add a small DB-backed fixed-window limiter or rely on the platform. At minimum:

- Honeypot field.
- Per-email idempotency.
- Origin check (`isAllowedOrigin` pattern used by AI routes).
- A `waitlist_join_attempt` counter keyed by IP hash if we want a strict limit. Do not add an in-memory map; it is unreliable on serverless.

### 6.2 Claim a waitlist entry after sign-up/sign-in

`claimWaitlistForUser(user)`:

1. Normalize `user.email`.
2. Find `waitlist_entry` by email.
3. If found and `userId` is null, set `userId`, `claimedAt`, `activatedAt`, `status = "active"`.
4. If found and linked to a different user, do nothing and log a warning (email changed or shared).
5. Call `ensureWallet(user.id)` and `ensureMonthlyAllocation(user.id)` so the first dashboard view already shows credits. `ensureWallet` applies the optional one-time signup grant.

Call this:

- After sign-up.
- On the first authenticated dashboard load, as a cheap idempotent check.
- When an admin links an entry manually.

### 6.3 Resolve the monthly allowance

`resolveMonthlyAllowance(userId)` reads:

- `user_plan` (tier, status, `premiumUntil`, `monthlyCreditOverride`).
- `waitlist_entry` linked to the user with status `joined` or `active`.

Rules:

```ts
if (override != null) return override;
if (plan.tier === "pro" && planActive) return CREDIT_POLICY.proMonthlyCredits;
if (waitlistActive) return CREDIT_POLICY.waitlistMonthlyCredits;
return 0; // Free users get no monthly grant. A signup grant, if enabled, is one-time.
```

### 6.4 Ensure the monthly allocation

`ensureMonthlyAllocation(userId, now = new Date())` runs in one transaction:

1. `ensureWallet(userId)` (insert a zero wallet if missing). `ensureWallet` is also where the optional one-time `signup_grant` is written, with idempotency `signup-grant:<userId>`; it must never run more than once.
2. Compute `periodKey` (UTC `YYYY-MM`).
3. If `wallet.monthlyPeriodKey === periodKey`, return the wallet.
4. Resolve the new allowance.
5. If the old monthly balance is positive, write a `monthly_expiry` ledger row with `amount = -oldBalance`, `bucket = "monthly"`, idempotency `monthly-expiry:<userId>:<oldPeriod>`.
6. If the new allowance is positive, write a `monthly_grant` ledger row with `amount = +allowance`, `bucket = "monthly"`, `periodKey`, idempotency `monthly-grant:<userId>:<periodKey>`.
7. Set `monthlyBalance = allowance`, `monthlyAllowance = allowance`, `monthlyPeriodKey = periodKey`, update lifetime counters.
8. Return the wallet.

Both idempotency keys make retries and concurrent calls safe. A unique-constraint violation means another request already did the work; re-read the wallet and return it.

### 6.5 Spend a credit for a résumé

`spendResumeCredit({ userId, resumeId, source })` runs in one transaction:

1. `ensureMonthlyAllocation(userId)`.
2. Re-read the wallet `FOR UPDATE`-equivalent (libSQL serializes writes; keep the transaction short).
3. If `monthlyBalance <= 0 && purchasedBalance <= 0`, throw `InsufficientCreditsError`.
4. Compute spend:
   - Take from monthly first, then purchased.
   - Insert one `resume_spend` ledger row per bucket touched, or one row with a `metadata` breakdown. Prefer one row per bucket so `balanceAfter*` is unambiguous.
   - Idempotency keys: `resume-spend:<resumeId>:monthly` and `resume-spend:<resumeId>:purchased`.
5. Update the wallet balances and `lifetimeSpent`.
6. Return the new balances.

`InsufficientCreditsError` is a typed error with `code = "INSUFFICIENT_CREDITS"`, `required`, `available`, and a user-facing message. Server functions translate it to a 402-style response; the UI shows the upgrade/credits CTA.

### 6.6 Server-authoritative enforcement in sync projection

Because résumés are created locally, the client guard is UX only. The server must enforce in `modules/sync/server/project-legacy.server.ts`.

Add a special case in `applyEvent`:

- When `row.collectionId === "resume"` and `row.type === "insert"` and the row id is new:
  1. Check whether a ledger row with idempotency `resume-spend:<resumeId>:monthly` or `resume-spend:<resumeId>:purchased` exists.
  2. If it exists, the charge was already applied (replay/rebuild); continue projecting.
  3. If it does not exist, call `spendResumeCredit(...)`.
  4. If the user has no credits, **defer** the event instead of failing it permanently. The existing projection has a `deferred` concept; reuse it with a reason such as `insufficient-credits`.
  5. If the charge succeeds, project the row.
- For `resume` updates and deletes, never charge.

Important details:

- Wrap the charge and the projection in one transaction if the projection path allows it. If that is too invasive, charge first and rely on the idempotency key; a failed projection retry will not double-charge.
- Rebuilds (`rebuildAllEventLogs`, `rebuildUserEventLog`) replay inserts. The idempotency key is what prevents a second charge. Test this explicitly.
- A deferred event should be retried after an admin grants credits. Document the admin runbook: grant credits, then project pending events.
- Surface the deferred state in the user UI: “A résumé is waiting for a credit” rather than silently hiding data.
- Desktop/self-host builds must bypass the projection charge when `VITE_DESKTOP`/premium flag is off.

### 6.7 Read wallet and ledger

`getWalletSummary(userId)`:

1. Ensure wallet and monthly allocation.
2. Return monthly balance, purchased balance, total, allowance, period key, reset date, plan, premiumUntil, waitlist status.
3. Include `purchaseEnabled` from the adapter.

`getCreditLedger({ userId, page, pageSize })`:

- Cursor or offset pagination. Admin lists use the shared paginated-list pattern; the user ledger can be a simple page table.
- Newest first.
- Return `items`, `total`, `page`, `pageSize`.

### 6.8 Admin credit grant/adjustment

`adminGrantCredits`:

Input: `userId`, `amount` (positive integer), `bucket` (`monthly`/`purchased`), `reason`, optional `reference`.

- Validate amount > 0.
- Transaction: ensure wallet, add to the chosen bucket, write `admin_grant` ledger row with a unique idempotency key from the request (`admin-grant:<uuid>`).
- Audit with `auditAdminAction("grant-credits", admin, { userId, amount, bucket }, ...)`.
- Never grant to a banned/deleted user; return a typed error.

`adminAdjustCredits`:

- Signed amount, reason required.
- Cannot take a bucket below zero; reject with available balance.
- Write `admin_adjustment`.
- Audit.

### 6.9 Admin plan controls

`adminSetPlan`:

- Input: `userId`, `tier` (`free`/`pro`), `premiumUntil` (nullable), `monthlyCredits` (nullable), `note`.
- Upsert `user_plan`.
- If downgrading to free, leave existing balances alone; the next monthly allocation grants 0 and expires the monthly bucket.
- Audit.
- Revalidate admin routes if needed.

### 6.10 Premium invites

`createPremiumInvite`:

- Input: `email`, optional `userId`, `monthlyCredits`, `oneTimeCredits`, `premiumDays`, `expiresInDays`, `note`.
- Normalize email.
- Generate a 32-byte random token, store only `tokenHash = sha256(token)`.
- Return the raw invite URL **once**: `${FRONTEND_URL}/invite/${token}`.
- Set status `pending`.
- If `userId` is provided and the admin chooses “apply now”, skip the token and apply the plan/credits immediately.
- Audit.

`acceptPremiumInvite`:

- Requires a signed-in user.
- Hash the token from the route, look up by `tokenHash`.
- Reject if not `pending`, expired, or revoked.
- Require `user.email.toLowerCase() === invite.email` unless an admin override flag is set.
- Transaction:
  - Upsert `user_plan` to `pro`, set `premiumUntil` from `premiumDays`, `source = "invite"`, `status = "active"`.
  - Grant `oneTimeCredits` to the purchased bucket with idempotency `invite:<inviteId>`.
  - Mark invite `accepted`, `acceptedByUserId`, `acceptedAt`.
  - Link/activate a waitlist entry for the same email if present.
- Return the new plan, premiumUntil, and credits.

`revokePremiumInvite`:

- Only pending invites.
- Set `revoked`.
- Audit.

No email is sent in this iteration. The admin UI shows the invite link with a copy button. Add an email adapter later.

---

## 7. Injectable purchase surface

No provider is chosen. Define the seam now so checkout can be added without touching the wallet API.

### 7.1 Interface

`apps/web/src/modules/premium/purchase/adapter.ts`:

```ts
export type CreditPack = {
  id: string;
  label: string;
  credits: number;
  priceCents: number;
  currency: string;
  description?: string;
};

export type StartPurchaseInput = {
  userId: string;
  packId: string;
  returnUrl: string;
  cancelUrl: string;
};

export type StartPurchaseResult =
  | { kind: "redirect"; url: string }
  | { kind: "unavailable"; reason: string }
  | { kind: "error"; message: string };

export interface CreditPurchaseAdapter {
  readonly id: string;
  readonly enabled: boolean;
  listPacks(): readonly CreditPack[];
  startPurchase(input: StartPurchaseInput): Promise<StartPurchaseResult>;
}
```

### 7.2 Manual adapter (current)

`manual-adapter.ts`:

```ts
export const manualPurchaseAdapter: CreditPurchaseAdapter = {
  id: "manual",
  enabled: false,
  listPacks: () => CREDIT_PACKAGES,
  async startPurchase() {
    return {
      kind: "unavailable",
      reason:
        "Purchasing is not open yet. Join the waitlist for monthly credits, or ask an admin for a grant.",
    };
  },
};
```

`getPurchaseAdapter()` returns this adapter. A future Stripe/Polar adapter implements the same interface and is selected by env/config. The UI already handles `unavailable`.

### 7.3 UI contract

- `/credits` shows packs with prices.
- If `purchaseEnabled` is false, the buy button is disabled and the reason is shown inline.
- If true, clicking calls `startCreditPurchase` and redirects.
- Never show a price and silently do nothing; always explain the current state.

### 7.4 Later provider checklist (do not implement now)

- Add `credit_purchase` and `payment_webhook_event` tables.
- Add `POST /api/webhooks/<provider>` with signature verification and idempotency.
- Grant only on the webhook, never on the success redirect.
- Add refund handling as a negative adjustment.
- Add provider env vars to `server-env.ts` and `.env.example`.
- Add end-to-end tests in test mode.

---

## 8. User-facing flows

### 8.1 Landing page waitlist

Change `LandingPricing.tsx`:

- The Pro CTA “Join the waitlist” opens a `WaitlistJoinDialog` instead of linking to `#faq`.
- The dialog collects email, optional name, and a consent checkbox.
- If the viewer is signed in, prefill the email from the session.
- On success: “You’re on the list. Credits start when your waitlist email is linked to an account.”
- On error: inline message, keep the form usable.
- Add `data-test="waitlist-join-form"`, `data-test="waitlist-join-submit"`, `data-test="waitlist-join-success"`.

Add a direct route `apps/web/src/routes/waitlist/index.tsx`:

- Same form, benefit bullets, and FAQ.
- Shareable URL for the landing page and admin copy.
- Prerender-safe (it does not need auth).

### 8.2 Dashboard credits card

Add to `routes/_dashboard/dashboard.tsx` or its `-components` folder:

- A `CreditBalanceCard` showing:
  - Total credits.
  - Monthly credits and reset date.
  - Purchased credits.
  - Plan badge (`Free`, `Waitlist`, `Pro`, `Admin`).
  - Link to `/credits`.
- If the user is not linked to the waitlist, show a compact “Join the waitlist” CTA.
- Loading state uses the shared `Skeleton`/`RouterPendingComponent`.
- Add `data-test="dashboard-credits-card"`.

### 8.3 `/credits` page

Layout follows the settings/profile page language:

- Page header: “Credits”.
- Summary card: total, monthly, purchased, period, plan.
- Waitlist status card: linked email, status, “what you get”.
- Packs card: prices and disabled buy button with the manual adapter reason.
- Ledger card: paginated table of grants/spends with reason and date.
- “How credits work” copy:
  - 1 credit = 1 résumé and all its sections.
  - Editing is free.
  - Monthly credits reset each month.
  - Purchased/admin credits carry over.
  - BYOK AI is not charged.
- `data-test` on the root, balance, packs, buy button, ledger rows.

### 8.4 Résumé creation gating

Add a shared client helper:

`apps/web/src/data-access-layer/event-sourced/resume/resume-credit-guard.ts`

```ts
export type ResumeCreditAction = "create" | "clone" | "import" | "tailor";

export async function ensureResumeCredit(input: {
  action: ResumeCreditAction;
  sourceId?: string;
}): Promise<
  | { ok: true; balance: number }
  | { ok: false; reason: "insufficient" | "signed-out" | "offline"; message: string }
>;
```

Behavior:

- If premium is disabled (desktop/self-host), return `{ ok: true }`.
- If signed out, return `signed-out`.
- Call a lightweight server function `checkResumeCredit` that ensures the monthly allocation and returns whether the user has at least one credit.
- If offline, return `offline`. The caller may allow the local write with a warning, because the server projection will defer until credits exist.
- Do not consume on this check; consumption happens at creation.

Call it before every creation path:

- `ResumeCreateForm` before `db.collections.resume.insert`.
- `ResumeList.handleClone` and `ResumeActionsSheet` before `cloneResume`.
- `ImportResumeJsonDialog` before `createLocalResumeFromDocument`.
- `local-resume-lifecycle-tools` (`create_resume`, `clone_resume`, `tailor_resume_for_job`).
- `local-start-resume-tool`.
- `import-from-legacy/resume-import.ts` (see below).

When the check fails:

- Show a `PremiumGate`/dialog with balance and a link to `/credits`.
- Do not write local data.
- For AI tools, return a tool error that the assistant can explain, e.g. “No résumé credits left. Ask the user to open Credits.”

Legacy import:

- The first migration pass should be grandfathered. Add a one-time flag or a server function that marks the import as a migration.
- If that is too much for the first pass, allow the import only when the user has enough credits for the number of résumés and show the count up front. Do not partially import and leave a confusing state.
- Document the chosen behavior in the import dialog copy.

### 8.5 Résumé list empty/pending states

- If the user has 0 credits and 0 résumés, the empty state says “You need one credit to create your first résumé” with a Credits link.
- If the user has existing résumés and 0 credits, they can still open, edit, export, and delete them.
- If a synced résumé is deferred for credits, show a banner on the list: “1 résumé is waiting for a credit. Open Credits to resolve it.”

### 8.6 Admin waitlist page

Route: `/_dashboard/admin/waitlist/`

- `validateSearch`: `page`, `q`, `status`, `hasAccount`.
- `beforeLoad` is inherited from `/_dashboard/admin`; no extra gate.
- `loader` ensures the first page query.
- `AdminWaitlistList` follows `docs/paginated-list-pattern.md`:
  - Scaffold with title, description, `SearchBox`, filter controls, children, `TSRListPagination`.
  - Pending, empty, search-empty, and loaded states all inside the scaffold.
  - `ADMIN_LIST_PER_PAGE`.
  - `data-test="admin-waitlist"`, `admin-waitlist-search`, `admin-waitlist-empty`, `admin-waitlist-row`.
- Columns:
  - Email, name.
  - Status badge.
  - Account (linked user name/email or “anonymous”).
  - Source.
  - Joined date.
  - Invited/activated date.
  - Actions.
- Filters: status (`joined`, `invited`, `active`, `removed`), has account, source.
- Actions per row:
  - Invite to premium (dialog).
  - Link to account (search existing users) or unlink.
  - Mark removed / restore.
  - Copy email.
  - Open user detail if linked.
- Header actions: “Export CSV” (admin-only, current filter), “Run monthly allocations” (optional catch-up).
- Empty state: “No one has joined the waitlist yet.”
- Search-empty state: “No waitlist entries match “{q}”.”

Admin home:

- Add a “Waitlist” section card linking to `/admin/waitlist`.
- Add a metric: total waitlist entries, linked accounts, active this month.
- Extend `admin-stats.server.ts` with those counts.

Admin users:

- Add Plan, Credits, Waitlist columns to `AdminUsersView`.
- Link each row to `/_dashboard/admin/users/$userId` for wallet/ledger/invite controls.
- Keep the existing search behavior; optionally convert to the shared paginated pattern later.

Admin user detail:

- Identity card: name, email, role, joined, banned.
- Plan card: tier, status, premiumUntil, monthly override, set-plan form.
- Wallet card: monthly/purchased balances, lifetime granted/spent, period.
- Ledger table: newest first, reason, amount, balances.
- Waitlist card: entry status, link/unlink, invite.
- Actions: grant credits, adjust credits, create invite, copy invite link.
- All mutations audit via `auditAdminAction` and invalidate the relevant queries.

### 8.7 Invite acceptance page

Route: `/invite/$token`

- Public route, no admin gate.
- If signed out: explain the invite and send to `/auth?returnTo=/invite/<token>`; after sign-in, return to the same page.
- If signed in with the matching email: show the plan/credits and an “Accept invite” button.
- If signed in with a different email: explain that the invite belongs to another email and offer to sign out.
- On success: show plan, premium until, credits, and a link to `/dashboard`.
- If expired/revoked/accepted: clear state with a support/contact hint.
- `data-test` on the invite card and accept button.

---

## 9. Security, privacy, and correctness

### 9.1 Authorization

- Reuse `adminMiddleware` for every admin mutation.
- Never trust `userId` from the client for self-service calls; use `context.viewer.user.id`.
- Admin can target another user only through admin functions and audit.
- Invite acceptance is tied to the signed-in email.

### 9.2 Idempotency and concurrency

- Every wallet mutation has a unique `idempotencyKey`.
- Monthly grants and expiries are keyed by user + period.
- Résumé spends are keyed by résumé id, so sync replay/rebuild does not double-charge.
- Transactions keep wallet and ledger consistent.
- On unique-constraint conflict, re-read and return the current state rather than throwing a 500.

### 9.3 Anti-abuse

- Waitlist join: honeypot, origin check, per-email dedupe, optional DB-backed rate limit.
- Monthly credits require a linked account, not just an email.
- Admin can remove a waitlist entry and cancel future allocations.
- Banning a user stops allocations and spending (check `user.banned`).
- No self-serve credit grants.

### 9.4 PII

- Waitlist emails are admin-only.
- Do not log raw emails in evlog wide events; log the entry id or a hash.
- On account deletion:
  - `user_plan`, `credit_wallet`, `credit_ledger` cascade with the user.
  - `waitlist_entry` should be deleted or anonymized if linked, unless marketing consent explicitly allows retention. Recommend deleting linked entries; keep aggregate counts.
  - `premium_invite.userId` is set null; the invite email remains until it expires or is revoked.
- Admin CSV export is audit-logged.

### 9.5 Local-first caveat

The client guard is not security. A modified client can insert a résumé locally. The server projection is the authority:

- Charge in the projection.
- Defer when credits are missing.
- Never project a new résumé row without a successful charge (except desktop/self-host).
- Document the repair path: admin grants credits, then runs projection.

### 9.6 Money-like properties

- Credits are not transferable and have no cash value.
- Do not display a dollar value for credits unless legal copy is ready.
- The ledger is append-only; corrections are new rows.
- Admin adjustments require a reason.

---

## 10. Migrations and rollout

### 10.1 Migration steps

1. Add `premium-schema.ts` and export it from `scheam/index.ts`.
2. Run `pnpm --dir apps/web db:generate`.
3. Review the generated SQL and journal entry. Do not hand-edit the SQL.
4. Run `pnpm --dir apps/web db:migrate` against the target database.
5. Deploy code with the premium flag enabled only after the migration succeeds.

The working tree currently has an unrelated modified `drizzle/migrations/meta/_journal.json`. Coordinate with that work before generating; do not commit someone else’s journal change with this feature.

### 10.2 Backfill

- No table backfill is required.
- `ensureWallet` creates rows lazily.
- Existing résumés are not charged retroactively.
- Existing users default to `free`.
- Existing waitlist data: none found; if a list exists outside the DB, import it with `source = "import"`.

### 10.3 Feature flags

- `PREMIUM_ENABLED` server-side.
- `VITE_PREMIUM_ENABLED` client-side.
- When off: hide credits/waitlist UI, skip projection charges, keep tables in place.
- Desktop/self-host: always off.

### 10.4 Phases

Each phase should be shippable and testable on its own.

**Phase 0 — Schema and config**

- [ ] Add `premium-schema.ts`, export it, generate and apply the migration.
- [ ] Add `config/premium.ts` and env flags.
- [ ] Add `ensureWallet` and ledger helpers with unit tests (no UI).
- [ ] Verify `pnpm check-types`, `pnpm test`, `pnpm lint` on touched files.

**Phase 1 — Waitlist capture and admin visibility**

- [ ] `joinWaitlist` server fn + zod schema + origin/honeypot checks.
- [ ] Landing pricing CTA opens `WaitlistJoinDialog`.
- [ ] Add `/waitlist` direct route.
- [ ] `claimWaitlistForUser` on sign-up/dashboard load.
- [ ] `listWaitlist` server fn with pagination/search/filters.
- [ ] `AdminWaitlistList` + `/admin/waitlist` route.
- [ ] Admin home card and stats.
- [ ] Admin link/unlink/remove actions with audit.
- [ ] Tests: join idempotency, normalization, admin list pagination, claim on login.

**Phase 2 — Wallet and monthly allocation**

- [ ] `getWalletSummary`, `getCreditLedger`.
- [ ] `ensureMonthlyAllocation` with expiry + grant ledger rows.
- [ ] `resolveMonthlyAllowance` (free/waitlist/pro/override).
- [ ] Credits card on dashboard.
- [ ] `/credits` page with summary, ledger, packs (disabled).
- [ ] Admin grant/adjust credits on user detail.
- [ ] Optional admin “Run monthly allocations” catch-up.
- [ ] Tests: monthly grant once, expiry, purchased carryover, concurrent allocation, admin adjustment bounds.

**Phase 3 — Résumé credit enforcement**

- [ ] `spendResumeCredit` with typed `InsufficientCreditsError`.
- [ ] `resume-credit-guard` client helper and `checkResumeCredit` server fn.
- [ ] Wire all creation paths: form, clone, JSON import, AI tools, start-from-job.
- [ ] Server projection charge + defer on insufficient credits.
- [ ] Empty/pending/deferred UI states.
- [ ] Legacy import policy (grandfather or count).
- [ ] Tests: every creation path blocks at zero; sync replay does not double-charge; deferred event applies after a grant.

**Phase 4 — Premium invites and plan**

- [ ] `createPremiumInvite`, `acceptPremiumInvite`, `revokePremiumInvite`.
- [ ] `/invite/$token` page and accept flow.
- [ ] Admin invite dialog with copyable link.
- [ ] `user_plan` admin controls.
- [ ] Plan badge on profile/settings/credits.
- [ ] Resolve pro allowance; pro gating helper for future features.
- [ ] Tests: token hash/expiry/email mismatch, one-time credit idempotency, plan expiry.

**Phase 5 — Purchase adapter (still no provider)**

- [ ] `CreditPurchaseAdapter` + manual adapter.
- [ ] `startCreditPurchase` returns `unavailable` with the manual reason.
- [ ] Credits page renders packs and the disabled state.
- [ ] Tests: adapter contract, UI state.
- [ ] Do not add checkout tables or webhooks until a provider is chosen.

**Phase 6 — Future provider (out of scope)**

- [ ] Choose provider.
- [ ] Add purchase/webhook tables, route, signature verification, refunds.
- [ ] Switch `getPurchaseAdapter()` by env.
- [ ] Test mode end-to-end.

---

## 11. UI details and conventions

- Use `ring-1 ring-base-content/10` for surfaces and `before:` hairlines for dividers; `border-*` is forced transparent in dark mode.
- Use shadcn components; DaisyUI only for theme utilities and simple buttons/cards as allowed by `AGENTS.md`.
- Every interactive surface gets a `data-test`.
- React 19 compiler: do not add `useMemo`/`useCallback`.
- Use TanStack Query `queryOptions`; do not wrap every query in a hook.
- Server functions validate with zod; errors are `unknown` in catch blocks; no `any` casts.
- Prefer object parameters for functions and components.
- Loading: use the shared `RouterPendingComponent`/`Skeleton`, not ad-hoc spinners.
- Empty states: use the shared `Empty` primitives where possible.
- Mobile: cards stack, tables scroll horizontally, dialogs use the shared responsive patterns.
- Copy: no invented dollar values, no “unlimited”, no fake scarcity. Say “credits”, “monthly”, “linked account”, “invite”.

---

## 12. Testing plan

### 12.1 Unit tests

- `resolveMonthlyAllowance`: free, waitlist, pro, override, expired pro, banned user.
- `ensureMonthlyAllocation`: first grant, same period no-op, new period expiry + grant, zero allowance, concurrent calls, unique conflict recovery.
- `spendResumeCredit`: monthly first, then purchased, insufficient, zero, idempotent replay, wallet snapshots.
- `adminGrantCredits` / `adminAdjustCredits`: positive, negative, below zero rejection, audit call.
- `createPremiumInvite` / `acceptPremiumInvite`: hash lookup, expired, revoked, wrong email, one-time grant idempotency, plan expiry.
- Waitlist email normalization and duplicate handling.
- Purchase adapter: manual adapter returns `unavailable`; contract type test.

Use the existing `data-access-layer/event-sourced/testing/app-test-db.ts` and Vitest patterns.

### 12.2 Server/integration tests

- Join waitlist anonymously, then sign in with the same email and verify the link + first allocation.
- Admin list pagination/search/filter with seeded entries.
- Admin grant then resume projection succeeds.
- Resume projection with zero credits defers; after grant, projection succeeds and the ledger has one charge.
- Rebuild event log does not double-charge.
- Invite acceptance sets plan and credits exactly once.

### 12.3 E2E (Playwright)

- Landing → join waitlist → success state.
- Admin sees the new entry, searches it, opens the invite dialog.
- Invite link → sign in → accept → plan badge and credits visible.
- Credits page → buy button disabled with the manual reason.
- Create résumé with credits → succeeds; at zero → blocked with Credits CTA.
- Clone/import at zero → blocked.
- Existing résumé still editable at zero.
- Admin grants credits → user can create again.

### 12.4 Quality gates

- `pnpm --dir apps/web check-types`
- `pnpm --dir apps/web test`
- `pnpm lint` (note: repo currently has pre-existing `loader.tsx` nested-ternary warnings unrelated to this feature)
- `vp fmt --check` on touched files.

---

## 13. Observability

- evlog wide events:
  - `waitlist.joined` (entry id, source, linked).
  - `credits.allocated` (userId, period, amount, reason).
  - `credits.spent` (userId, resumeId, amount, buckets).
  - `credits.denied` (userId, action, available).
  - `premium.invite_created` / `premium.invite_accepted`.
  - `sync.resume_deferred` (userId, resumeId, reason).
- Admin audit for every admin mutation via `auditAdminAction`.
- Metrics to watch:
  - Waitlist entries, linked %, monthly active waitlist users.
  - Credits outstanding (monthly liability vs purchased).
  - Creations blocked at zero.
  - Deferred résumé projections.
  - Invite conversion.
- Urgentry for caught errors; do not double-report expected `INSUFFICIENT_CREDITS`.

---

## 14. Open product questions

These do not block Phase 0–2; lock them before the UI copy ships.

1. **Monthly amounts.** Placeholder: 10 for waitlist, 25 for pro, 1 signup credit. What feels right for “a bunch”?
2. **Free baseline.** Should a new free account get 1 lifetime credit, or 0? Existing résumés are grandfathered either way.
3. **Deletion refunds.** Recommend no automatic refund. Confirm.
4. **Cover letters and application answers.** Recommend included free with a résumé credit. Confirm.
5. **Legacy import.** Recommend free for the first migration. Confirm.
6. **Pro plan duration.** Default invite duration: 30 days, 1 year, or lifetime? The schema supports all three; the admin dialog needs a default.
7. **Waitlist + pro overlap.** Recommend `max(waitlist, pro)` unless an override is set.
8. **Email provider.** None today. Confirm copy-link invites are acceptable until one is added.
9. **Legal copy.** Credits have no cash value, monthly credits expire, no refunds. This needs a terms/privacy pass before public launch.
10. **Purchase provider later.** Stripe remains the default recommendation; the adapter keeps the choice open.

---

## 15. Acceptance criteria

The feature is done when:

- [ ] An anonymous visitor can join the waitlist from the landing page and a direct `/waitlist` page.
- [ ] An admin can see every waitlist entry, search/filter/paginate it, and open a detail view.
- [ ] A signed-in user whose email matches a waitlist entry is linked automatically and receives the current month’s credits once.
- [ ] A linked waitlist user receives a fresh monthly allocation each month, idempotently, without a cron dependency.
- [ ] The dashboard shows the user’s credits, plan, and reset date.
- [ ] Creating, cloning, importing, or AI-generating a résumé consumes exactly one credit and is blocked at zero.
- [ ] Editing an existing résumé and its related collections never consumes credits.
- [ ] The server projection enforces the same rule and defers rather than silently accepting uncredited résumés.
- [ ] An admin can grant/adjust credits with a reason, and the action is audited.
- [ ] An admin can invite an email or user to pro; the invite page applies the plan and one-time credits exactly once.
- [ ] The purchase surface exists behind an adapter, is disabled with a clear reason today, and can accept a provider later without changing wallet APIs.
- [ ] No payment provider, checkout, webhook, or unused purchase table ships in this iteration.
- [ ] Typecheck, tests, and lint pass for touched files; the pre-existing `loader.tsx` warnings are called out separately.
- [ ] No auth schema or generated migration files are hand-edited.
- [ ] The settings/profile commit `09d060f` remains isolated from this work.

---

## 16. First implementation slice (recommended)

To keep the first PR reviewable:

1. Add `premium-schema.ts` + config + migration.
2. Add wallet/ledger primitives with unit tests.
3. Add `joinWaitlist` + `/waitlist` + landing dialog.
4. Add `listWaitlist` + `AdminWaitlistList` + admin home card.
5. Stop there and ship.

That gives the admin the visibility they asked for and captures demand before any credit is spent. The monthly allocation and résumé gating land in the next PR, so a bad migration or projection change cannot block the waitlist launch.
