import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { user } from "@repo/db/schema/auth-schema";
import { creditLedger, creditWallet } from "@repo/db/schema/credits-schema";
import { ensureWallet, type CreditWallet } from "@api/routes/wallet/store";
import { AdjustmentBelowZeroError, BannedUserError, UnknownUserError } from "./errors";

/** Admin bonus grant (plan §5.5). Bonus credits carry over across months. */
export async function adminGrantCredits(input: {
  userId: string;
  amount: number;
  reason: string;
  adminUserId: string;
}): Promise<CreditWallet> {
  await assertGrantableUser(input.userId);

  return db.transaction(async (tx) => {
    const wallet = await ensureWallet(tx, input.userId);
    await tx.insert(creditLedger).values({
      userId: input.userId,
      bucket: "bonus",
      type: "admin_grant",
      amount: input.amount,
      reason: input.reason,
      createdByUserId: input.adminUserId,
      idempotencyKey: `admin:${crypto.randomUUID()}`,
    });
    const [updated] = await tx
      .update(creditWallet)
      .set({ bonusBalance: wallet.bonusBalance + input.amount })
      .where(eq(creditWallet.userId, input.userId))
      .returning();
    return updated!;
  });
}

/**
 * Admin signed adjustment (plan §5.5). Rejects any change that would take the
 * target bucket below zero.
 */
export async function adminAdjustCredits(input: {
  userId: string;
  bucket: "monthly" | "bonus";
  amount: number;
  reason: string;
  adminUserId: string;
}): Promise<CreditWallet> {
  await assertGrantableUser(input.userId);

  return db.transaction(async (tx) => {
    const wallet = await ensureWallet(tx, input.userId);
    const current = input.bucket === "monthly" ? wallet.monthlyBalance : wallet.bonusBalance;
    const next = current + input.amount;
    if (next < 0) throw new AdjustmentBelowZeroError({ bucket: input.bucket });

    await tx.insert(creditLedger).values({
      userId: input.userId,
      bucket: input.bucket,
      type: "admin_adjustment",
      amount: input.amount,
      reason: input.reason,
      createdByUserId: input.adminUserId,
      idempotencyKey: `admin:${crypto.randomUUID()}`,
    });
    const [updated] = await tx
      .update(creditWallet)
      .set(input.bucket === "monthly" ? { monthlyBalance: next } : { bonusBalance: next })
      .where(eq(creditWallet.userId, input.userId))
      .returning();
    return updated!;
  });
}

async function assertGrantableUser(userId: string): Promise<void> {
  const [account] = await db
    .select({ id: user.id, banned: user.banned })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!account) throw new UnknownUserError();
  if (account.banned) throw new BannedUserError();
}
