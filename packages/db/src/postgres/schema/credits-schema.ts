import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth-schema.ts";
import { timestamps, timestamptz } from "./resume/shared-columns.ts";

/**
 * Snapshot of a user's credit balance. The `credit_ledger` is the append-only
 * source of truth; this row exists so reads don't have to sum the ledger.
 */
export const creditWallet = pgTable(
  "credit_wallet",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    monthlyBalance: integer("monthly_balance").default(0).notNull(),
    bonusBalance: integer("bonus_balance").default(0).notNull(),
    /** `YYYY-MM` (UTC) of the last monthly allocation; null before the first grant. */
    monthlyPeriodKey: text("monthly_period_key"),
    ...timestamps,
  },
  (table) => [index("credit_wallet_monthlyPeriodKey_idx").on(table.monthlyPeriodKey)],
);

/**
 * Append-only ledger. Every balance change is a row; spends and grants are
 * idempotent via `idempotencyKey`.
 */
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** `monthly` | `bonus` */
    bucket: text("bucket").notNull(),
    /** `monthly_grant` | `monthly_expiry` | `admin_grant` | `admin_adjustment` | `resume_spend` | `resume_overdraft` */
    type: text("type").notNull(),
    /** Signed; negative for spends and expiries. */
    amount: integer("amount").notNull(),
    /** `YYYY-MM` for monthly rows; null otherwise. */
    periodKey: text("period_key"),
    /** Set for spends/overdrafts. No FK: the résumé can be deleted later. */
    resumeId: text("resume_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    /** Required for admin rows. */
    reason: text("reason"),
    /** The admin who wrote an admin row. */
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("credit_ledger_idempotencyKey_idx").on(table.idempotencyKey),
    index("credit_ledger_userId_createdAt_idx").on(table.userId, table.createdAt),
    index("credit_ledger_resumeId_idx").on(table.resumeId),
  ],
);

/**
 * Demand capture for future paid features. Also serves as the eligibility list
 * when `CREDIT_POLICY.requireWaitlist` is on.
 */
export const waitlistEntry = pgTable(
  "waitlist_entry",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    /** Normalized (`trim().toLowerCase()`), unique. */
    email: text("email").notNull(),
    name: text("name"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /** `joined` | `removed` */
    status: text("status").default("joined").notNull(),
    /** `landing` | `waitlist-page` | `admin` */
    source: text("source").notNull(),
    consentAt: timestamptz("consent_at").notNull(),
    claimedAt: timestamptz("claimed_at"),
    /** Admin-only. */
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("waitlist_entry_email_idx").on(table.email),
    index("waitlist_entry_status_createdAt_idx").on(table.status, table.createdAt),
    index("waitlist_entry_userId_idx").on(table.userId),
  ],
);

export const creditWalletRelations = relations(creditWallet, ({ one }) => ({
  user: one(user, {
    fields: [creditWallet.userId],
    references: [user.id],
  }),
}));

export const creditLedgerRelations = relations(creditLedger, ({ one }) => ({
  user: one(user, {
    fields: [creditLedger.userId],
    references: [user.id],
  }),
}));

export const waitlistEntryRelations = relations(waitlistEntry, ({ one }) => ({
  user: one(user, {
    fields: [waitlistEntry.userId],
    references: [user.id],
  }),
}));
