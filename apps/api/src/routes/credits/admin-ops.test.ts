import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { user } from "@repo/db/schema/auth-schema";
import { creditWallet } from "@repo/db/schema/credits-schema";
import {
  AdjustmentBelowZeroError,
  adminAdjustCredits,
  adminGrantCredits,
  ensureMonthlyAllocation,
  spendResumeCredit,
} from "./wallet";
import { cleanupTouchedUsers, FEB_2026, MAR_2026, signUp } from "./test-helpers";

afterAll(cleanupTouchedUsers);

describe("admin grants and adjustments", () => {
  it("grants bonus credits that carry over across month rollover", async () => {
    const { userId } = await signUp("bonus-carryover@example.com", "Carryover");
    const adminId = userId;

    await ensureMonthlyAllocation({ userId, now: FEB_2026 });
    await adminGrantCredits({ userId, amount: 5, reason: "beta thanks", adminUserId: adminId });

    // February: 20 monthly + 5 bonus.
    let [wallet] = await db.select().from(creditWallet).where(eq(creditWallet.userId, userId));
    expect(wallet!.bonusBalance).toBe(5);

    // March reset: monthly becomes 20 again, bonus untouched.
    await ensureMonthlyAllocation({ userId, now: MAR_2026 });
    [wallet] = await db.select().from(creditWallet).where(eq(creditWallet.userId, userId));
    expect(wallet!.monthlyBalance).toBe(20);
    expect(wallet!.bonusBalance).toBe(5);

    // Bonus survives a monthly spend.
    const spent = await spendResumeCredit({ userId, resumeId: "carry-1", now: MAR_2026 });
    if (spent.status !== "charged") throw new Error("expected charged");
    expect(spent.bucket).toBe("monthly");
    [wallet] = await db.select().from(creditWallet).where(eq(creditWallet.userId, userId));
    expect(wallet!.monthlyBalance).toBe(19);
    expect(wallet!.bonusBalance).toBe(5);
  });

  it("rejects grants to unknown and banned users", async () => {
    const adminId = "any-admin-user-id";

    await expect(
      adminGrantCredits({ userId: "no-such-user", amount: 1, reason: "x", adminUserId: adminId }),
    ).rejects.toMatchObject({ code: "UNKNOWN_USER" });

    const { userId } = await signUp("grant-banned@example.com", "Banned");
    await db.update(user).set({ banned: true }).where(eq(user.id, userId));
    await expect(
      adminGrantCredits({ userId, amount: 1, reason: "x", adminUserId: adminId }),
    ).rejects.toMatchObject({ code: "USER_BANNED" });
  });

  it("rejects adjustments that would take a bucket below zero", async () => {
    const { userId } = await signUp("adjust-below@example.com", "Adjust");
    const adminId = userId;

    await expect(
      adminAdjustCredits({
        userId,
        bucket: "bonus",
        amount: -1,
        reason: "clawback",
        adminUserId: adminId,
      }),
    ).rejects.toBeInstanceOf(AdjustmentBelowZeroError);

    // A positive adjustment then a matching negative one works.
    await adminAdjustCredits({
      userId,
      bucket: "bonus",
      amount: 2,
      reason: "make good",
      adminUserId: adminId,
    });
    const wallet = await adminAdjustCredits({
      userId,
      bucket: "bonus",
      amount: -2,
      reason: "reversal",
      adminUserId: adminId,
    });
    expect(wallet.bonusBalance).toBe(0);
  });
});
