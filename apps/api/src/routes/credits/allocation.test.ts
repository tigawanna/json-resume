import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { user } from "@repo/db/schema/auth-schema";
import { creditLedger, creditWallet } from "@repo/db/schema/credits-schema";
import { ensureMonthlyAllocation, periodKeyOf, spendResumeCredit } from "./wallet";
import {
  cleanupTouchedUsers,
  FEB_2026,
  MAR_2026,
  signUp,
  walletRequest,
  type WalletResponse,
} from "./test-helpers";

afterAll(cleanupTouchedUsers);

describe("lazy monthly allocation", () => {
  it("grants 20 credits on first read, exactly once per month", async () => {
    const { cookie } = await signUp("wallet-grant@example.com", "Grant");

    const first = await walletRequest(cookie);
    expect(first.status).toBe(200);
    const wallet = (await first.json()) as WalletResponse;
    expect(wallet.monthly).toBe(20);
    expect(wallet.bonus).toBe(0);
    expect(wallet.available).toBe(20);
    expect(wallet.monthlyPeriodKey).toBe(periodKeyOf(new Date()));
    expect(wallet.waitlistJoined).toBe(false);

    // Second read: no double grant.
    const second = await walletRequest(cookie);
    expect(((await second.json()) as WalletResponse).monthly).toBe(20);
  });

  it.skipIf(!process.env.TEST_DATABASE_URL)(
    "does not double-grant under concurrent allocation",
    async () => {
      const { userId } = await signUp("wallet-concurrent@example.com", "Concurrent");

      // Six concurrent allocations for the same period.
      await Promise.all(
        Array.from({ length: 6 }, () => ensureMonthlyAllocation({ userId, now: FEB_2026 })),
      );

      const grants = await db.select().from(creditLedger).where(eq(creditLedger.userId, userId));
      const grantRows = grants.filter((row) => row.type === "monthly_grant");
      expect(grantRows).toHaveLength(1);
      expect(grantRows[0]!.amount).toBe(20);

      const [wallet] = await db
        .select()
        .from(creditWallet)
        .where(eq(creditWallet.userId, userId))
        .limit(1);
      expect(wallet!.monthlyBalance).toBe(20);
    },
  );

  it("rolls the monthly bucket over: unused credits expire, a new grant lands", async () => {
    const { userId } = await signUp("wallet-rollover@example.com", "Rollover");

    const feb = await ensureMonthlyAllocation({ userId, now: FEB_2026 });
    expect(feb.granted).toBe(true);
    expect(feb.wallet.monthlyBalance).toBe(20);

    // Spend 2 in February; the remaining 18 expire at the March reset.
    await spendResumeCredit({ userId, resumeId: "resume-feb-1", now: FEB_2026 });
    await spendResumeCredit({ userId, resumeId: "resume-feb-2", now: FEB_2026 });

    const mar = await ensureMonthlyAllocation({ userId, now: MAR_2026 });
    expect(mar.granted).toBe(true);
    expect(mar.expired).toBe(18);
    expect(mar.wallet.monthlyBalance).toBe(20);

    const ledger = await db.select().from(creditLedger).where(eq(creditLedger.userId, userId));
    const expiry = ledger.find((row) => row.type === "monthly_expiry");
    expect(expiry).toBeDefined();
    expect(expiry!.periodKey).toBe("2026-03");
    expect(expiry!.amount).toBe(-18);

    const grantCount = ledger.filter((row) => row.type === "monthly_grant").length;
    expect(grantCount).toBe(2); // one per month
  });
});

describe("allocation across months", () => {
  it("issues one grant per period and expires the old balance", async () => {
    const { userId } = await signUp("wallet-periods@example.com", "Periods");

    await ensureMonthlyAllocation({ userId, now: FEB_2026 });
    const mar = await ensureMonthlyAllocation({ userId, now: MAR_2026 });
    expect(mar.granted).toBe(true);

    const ledger = await db.select().from(creditLedger).where(eq(creditLedger.userId, userId));
    const grants = ledger.filter((row) => row.type === "monthly_grant");
    expect(grants).toHaveLength(2);
    const periodKeys = grants
      .map((row) => row.periodKey)
      .sort((a, b) => (a ?? "").localeCompare(b ?? ""));
    expect(periodKeys).toEqual(["2026-02", "2026-03"]);
  });

  it("gives banned users no monthly grant", async () => {
    const { userId, cookie } = await signUp("wallet-banned@example.com", "Banned");
    await db.update(user).set({ banned: true }).where(eq(user.id, userId));

    const res = await walletRequest(cookie);
    expect(res.status).toBe(200);
    const wallet = (await res.json()) as WalletResponse;
    expect(wallet.monthly).toBe(0);
    expect(wallet.bonus).toBe(0);

    const result = await ensureMonthlyAllocation({ userId, now: FEB_2026 });
    expect(result.granted).toBe(false);
    expect(result.wallet.monthlyBalance).toBe(0);
  });
});
