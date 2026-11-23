import { creditLedger, creditWallet } from "@repo/db/schema/credits-schema";
import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../database/database.module.js";
import { isEligibleForMonthly } from "./eligibility.js";
import { periodKeyOf } from "./period.js";

/** Tunable credit amounts and whether a waitlist join is required to receive monthly credits. */
export type CreditsPolicy = {
  monthlyCredits: number;
  resumeCost: number;
  requireWaitlist: boolean;
};

/**
 * Lazy monthly grant: create a wallet if needed, then expire leftover monthly credits and grant a
 * new bucket when the UTC period has changed. Same period is a no-op. Ledger rows use unique
 * idempotency keys so a retried transaction does not double-grant or double-expire.
 */
export async function ensureMonthlyAllocation({
  db,
  userId,
  policy,
  now = new Date(),
}: {
  db: DrizzleDB;
  userId: string;
  policy: CreditsPolicy;
  now?: Date;
}) {
  const periodKey = periodKeyOf({ date: now });
  return db.transaction(async (tx) => {
    // Load the current wallet if this user already has one.
    let wallet = await readWallet({ db: tx, userId });
    // First visit: create an empty wallet for this user.
    if (!wallet) {
      await tx.insert(creditWallet).values({ userId }).onConflictDoNothing();
      wallet = await readWallet({ db: tx, userId });
      if (!wallet) throw new Error("Failed to create credit wallet");
    }
    // Already rolled this UTC month: skip expiry, grant, and wallet write.
    if (wallet.monthlyPeriodKey === periodKey) {
      return { wallet, granted: false, expired: 0 };
    }
    // Decide whether this user gets a monthly grant this period.
    const eligible = await isEligibleForMonthly({
      db: tx,
      userId,
      requireWaitlist: policy.requireWaitlist,
    });
    // Unused monthly credits do not carry over. The unique key makes a retry a no-op.
    if (wallet.monthlyBalance > 0) {
      await tx
        .insert(creditLedger)
        .values({
          userId,
          bucket: "monthly",
          type: "monthly_expiry",
          amount: -wallet.monthlyBalance,
          periodKey,
          idempotencyKey: `monthly-expiry:${userId}:${periodKey}`,
        })
        .onConflictDoNothing({ target: creditLedger.idempotencyKey });
    }
    // Ineligible users still advance the period so they are not retried until next month.
    if (eligible) {
      await tx
        .insert(creditLedger)
        .values({
          userId,
          bucket: "monthly",
          type: "monthly_grant",
          amount: policy.monthlyCredits,
          periodKey,
          idempotencyKey: `monthly-grant:${userId}:${periodKey}`,
        })
        .onConflictDoNothing({ target: creditLedger.idempotencyKey });
    }
    // Store the new monthly balance and mark this period as already allocated.
    const [updated] = await tx
      .update(creditWallet)
      .set({
        monthlyBalance: eligible ? policy.monthlyCredits : 0,
        monthlyPeriodKey: periodKey,
      })
      .where(eq(creditWallet.userId, userId))
      .returning();
    if (!updated) throw new Error("Failed to update credit wallet");
    return {
      wallet: updated,
      granted: eligible,
      expired: wallet.monthlyBalance,
    };
  });
}

/** Load the user's credit wallet, or undefined before the first insert. */
async function readWallet({ db, userId }: { db: Pick<DrizzleDB, "select">; userId: string }) {
  const [wallet] = await db
    .select()
    .from(creditWallet)
    .where(eq(creditWallet.userId, userId))
    .limit(1);
  return wallet;
}
