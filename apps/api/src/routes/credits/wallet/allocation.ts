import { CREDIT_POLICY } from "@repo/isomorphic/credits-policy";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { creditLedger, creditWallet } from "@repo/db/schema/credits-schema";
import { isEligibleForMonthly } from "./eligibility";
import { periodKeyOf } from "./period";
import { readWallet, type CreditWallet } from "./store";

/**
 * Lazy monthly allocation (plan §5.2). Runs on the first wallet read or spend
 * of a UTC month — no cron. A new month replaces the monthly bucket; the bonus
 * bucket is untouched. Idempotent via ledger keys, safe to call concurrently.
 */
export async function ensureMonthlyAllocation(input: { userId: string; now?: Date }): Promise<{
  wallet: CreditWallet;
  granted: boolean;
  expired: number;
}> {
  const now = input.now ?? new Date();
  const periodKey = periodKeyOf(now);

  return db.transaction(async (tx) => {
    let wallet = await readWallet(tx, input.userId);
    if (!wallet) {
      await tx.insert(creditWallet).values({ userId: input.userId }).onConflictDoNothing();
      wallet = await readWallet(tx, input.userId);
      if (!wallet) throw new Error("Failed to create credit wallet");
    }

    if (wallet.monthlyPeriodKey === periodKey) {
      return { wallet, granted: false, expired: 0 };
    }

    const eligible = await isEligibleForMonthly(tx, input.userId);

    // Unused monthly credits expire (use-it-or-lose-it). Keyed per month, so a
    // lost race writes nothing.
    if (wallet.monthlyBalance > 0) {
      await tx
        .insert(creditLedger)
        .values({
          userId: input.userId,
          bucket: "monthly",
          type: "monthly_expiry",
          amount: -wallet.monthlyBalance,
          periodKey,
          idempotencyKey: `monthly-expiry:${input.userId}:${periodKey}`,
        })
        .onConflictDoNothing({ target: creditLedger.idempotencyKey });
    }

    if (eligible) {
      await tx
        .insert(creditLedger)
        .values({
          userId: input.userId,
          bucket: "monthly",
          type: "monthly_grant",
          amount: CREDIT_POLICY.monthlyCredits,
          periodKey,
          idempotencyKey: `monthly-grant:${input.userId}:${periodKey}`,
        })
        .onConflictDoNothing({ target: creditLedger.idempotencyKey });
    }

    const [updated] = await tx
      .update(creditWallet)
      .set({
        monthlyBalance: eligible ? CREDIT_POLICY.monthlyCredits : 0,
        monthlyPeriodKey: periodKey,
      })
      .where(eq(creditWallet.userId, input.userId))
      .returning();

    return { wallet: updated!, granted: eligible, expired: wallet.monthlyBalance };
  });
}
