import { CREDIT_POLICY } from "@repo/isomorphic/credits-policy";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { creditLedger, creditWallet } from "@repo/db/schema/credits-schema";
import { ensureMonthlyAllocation } from "@api/routes/wallet/allocation";
import { ensureWallet, readWallet } from "@api/routes/wallet/store";
import { InsufficientCreditsError } from "./errors";

export type SpendResult =
  | { status: "charged"; bucket: "monthly" | "bonus"; balance: number }
  | { status: "already-charged" }
  | { status: "grandfathered" };

/**
 * Charge one credit for a new résumé (plan §5.3). Idempotent per `resumeId`:
 * replays, rebuilds, and retries never double-charge. Monthly credits are
 * spent first (they expire), then bonus.
 */
export async function spendResumeCredit(input: {
  userId: string;
  resumeId: string;
  now?: Date;
  /** Free, legacy-imported résumé: record the key at cost 0 (plan §6.4). */
  grandfathered?: boolean;
  /** Optional reason recorded on the ledger row. */
  reason?: string;
}): Promise<SpendResult> {
  const idempotencyKey = `resume:${input.resumeId}`;
  const [existing] = await db
    .select({ id: creditLedger.id })
    .from(creditLedger)
    .where(eq(creditLedger.idempotencyKey, idempotencyKey))
    .limit(1);
  if (existing) return { status: "already-charged" };

  if (input.grandfathered) {
    await db.transaction(async (tx) => {
      await ensureWallet(tx, input.userId);
      await tx.insert(creditLedger).values({
        userId: input.userId,
        bucket: "monthly",
        type: "resume_spend",
        amount: 0,
        idempotencyKey,
        resumeId: input.resumeId,
        reason: input.reason ?? "grandfathered",
      });
    });
    return { status: "grandfathered" };
  }

  await ensureMonthlyAllocation({ userId: input.userId, now: input.now });
  return chargeResumeSpend(input, idempotencyKey);
}

/**
 * A client bypassed the guard (offline, modified, or raced) and synced a résumé
 * with no credits left. Record an amount-0 row under the same idempotency key
 * so the charge is never retried and the admin can see it. Data is never held.
 */
export async function recordResumeOverdraft(input: {
  userId: string;
  resumeId: string;
}): Promise<void> {
  await db
    .insert(creditLedger)
    .values({
      userId: input.userId,
      bucket: "monthly",
      type: "resume_overdraft",
      amount: 0,
      idempotencyKey: `resume:${input.resumeId}`,
      resumeId: input.resumeId,
      reason: "overdraft",
    })
    .onConflictDoNothing();
}

async function chargeResumeSpend(
  input: { userId: string; resumeId: string },
  idempotencyKey: string,
): Promise<SpendResult> {
  const cost = CREDIT_POLICY.resumeCost;
  return db.transaction(async (tx) => {
    const wallet = await readWallet(tx, input.userId);
    if (!wallet) throw new Error("Failed to read credit wallet");

    const available = wallet.monthlyBalance + wallet.bonusBalance;
    if (available < cost) {
      throw new InsufficientCreditsError({ available });
    }

    // Debit monthly first, then bonus. With the current cost of 1 this is a
    // single bucket; the loop keeps a future cost change correct.
    let remaining = cost;
    let chargedBucket: "monthly" | "bonus" = "bonus";
    for (const bucket of ["monthly", "bonus"] as const) {
      const balance = bucket === "monthly" ? wallet.monthlyBalance : wallet.bonusBalance;
      const take = Math.min(balance, remaining);
      if (take <= 0) continue;
      await tx.insert(creditLedger).values({
        userId: input.userId,
        bucket,
        type: "resume_spend",
        amount: -take,
        idempotencyKey: remaining === cost ? idempotencyKey : `${idempotencyKey}:${bucket}`,
        resumeId: input.resumeId,
      });
      chargedBucket = bucket;
      remaining -= take;
    }

    const [updated] = await tx
      .update(creditWallet)
      .set({
        monthlyBalance: wallet.monthlyBalance - Math.min(wallet.monthlyBalance, cost),
        bonusBalance: wallet.bonusBalance - Math.max(0, cost - wallet.monthlyBalance),
      })
      .where(eq(creditWallet.userId, input.userId))
      .returning();

    return {
      status: "charged" as const,
      bucket: chargedBucket,
      balance: updated!.monthlyBalance + updated!.bonusBalance,
    };
  });
}
