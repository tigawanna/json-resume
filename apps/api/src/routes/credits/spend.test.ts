import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { user } from "@repo/db/schema/auth-schema";
import { creditLedger, creditWallet } from "@repo/db/schema/credits-schema";
import {
  adminAdjustCredits,
  adminGrantCredits,
  ensureMonthlyAllocation,
  InsufficientCreditsError,
  spendResumeCredit,
} from "./wallet";
import { cleanupTouchedUsers, FEB_2026, signUp } from "./test-helpers";

afterAll(cleanupTouchedUsers);

describe("spendResumeCredit", () => {
  it("charges once per résumé, replays return already-charged", async () => {
    const { userId } = await signUp("spend-idempotent@example.com", "Idempotent");

    const first = await spendResumeCredit({ userId, resumeId: "res-1", now: FEB_2026 });
    if (first.status !== "charged") throw new Error("expected charged");
    expect(first.bucket).toBe("monthly");

    const replay = await spendResumeCredit({ userId, resumeId: "res-1", now: FEB_2026 });
    expect(replay.status).toBe("already-charged");

    const [wallet] = await db
      .select()
      .from(creditWallet)
      .where(eq(creditWallet.userId, userId))
      .limit(1);
    expect(wallet!.monthlyBalance).toBe(19);
  });

  it("throws InsufficientCreditsError when the wallet is empty", async () => {
    const { userId } = await signUp("spend-empty@example.com", "Empty");

    // A wallet that never got a grant (banned) has nothing to spend.
    await db.update(user).set({ banned: true }).where(eq(user.id, userId));
    await ensureMonthlyAllocation({ userId, now: FEB_2026 });

    await expect(
      spendResumeCredit({ userId, resumeId: "res-empty", now: FEB_2026 }),
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
  });

  it("spends monthly before bonus while both buckets have funds", async () => {
    const { userId } = await signUp("spend-both@example.com", "Both");
    await ensureMonthlyAllocation({ userId, now: FEB_2026 }); // 20 monthly
    await adminGrantCredits({ userId, amount: 3, reason: "test", adminUserId: userId });

    const result = await spendResumeCredit({ userId, resumeId: "res-both", now: FEB_2026 });
    if (result.status !== "charged") throw new Error("expected charged");
    expect(result.bucket).toBe("monthly");

    const [wallet] = await db
      .select()
      .from(creditWallet)
      .where(eq(creditWallet.userId, userId))
      .limit(1);
    expect(wallet!.monthlyBalance).toBe(19);
    expect(wallet!.bonusBalance).toBe(3);

    const rows = await db.select().from(creditLedger).where(eq(creditLedger.userId, userId));
    expect(rows.find((row) => row.type === "resume_spend")).toMatchObject({
      bucket: "monthly",
      amount: -1,
    });
  });

  it("spends monthly first, then bonus", async () => {
    const { userId } = await signUp("spend-order@example.com", "Order");

    await ensureMonthlyAllocation({ userId, now: FEB_2026 }); // 20 monthly
    await adminGrantCredits({ userId, amount: 3, reason: "test", adminUserId: userId });

    // Drain the monthly bucket, then the next spend must hit bonus.
    await adminAdjustCredits({
      userId,
      bucket: "monthly",
      amount: -20,
      reason: "test: drain monthly",
      adminUserId: userId,
    });
    const last = await spendResumeCredit({ userId, resumeId: "res-20", now: FEB_2026 });
    if (last.status !== "charged") throw new Error("expected charged");
    expect(last.bucket).toBe("bonus");

    const [wallet] = await db
      .select()
      .from(creditWallet)
      .where(eq(creditWallet.userId, userId))
      .limit(1);
    expect(wallet!.monthlyBalance).toBe(0);
    expect(wallet!.bonusBalance).toBe(2);

    const spendRows = await db.select().from(creditLedger).where(eq(creditLedger.userId, userId));
    const bonusSpend = spendRows.find(
      (row) => row.type === "resume_spend" && row.bucket === "bonus",
    );
    expect(bonusSpend).toBeDefined();
    expect(bonusSpend!.amount).toBe(-1);
  });

  it("records grandfathered résumés at cost 0", async () => {
    const { userId } = await signUp("spend-grandfathered@example.com", "Grand");

    const result = await spendResumeCredit({
      userId,
      resumeId: "res-legacy",
      grandfathered: true,
    });
    expect(result.status).toBe("grandfathered");

    const [wallet] = await db
      .select()
      .from(creditWallet)
      .where(eq(creditWallet.userId, userId))
      .limit(1);
    expect(wallet!.monthlyBalance).toBe(0); // no allocation forced

    const rows = await db.select().from(creditLedger).where(eq(creditLedger.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBe(0);
    expect(rows[0]!.type).toBe("resume_spend");
  });
});
