import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, getDb, setDb } from "@api/db/client";
import { createTestDb } from "../../../../tests/setup/local-db";
import { user } from "@repo/db/schema/auth-schema";
import { creditLedger, creditWallet } from "@repo/db/schema/credits-schema";
import { spendResumeCredit } from "@api/modules/credits";
import { ensureMonthlyAllocation, periodKeyOf } from "@api/modules/wallet";
import {
  cleanupTouchedUsers,
  FEB_2026,
  MAR_2026,
  signUp,
  walletRequest,
  type WalletResponse,
} from "@api/modules/credits/tests/test-helpers";

afterAll(cleanupTouchedUsers);

describe("lazy monthly allocation", () => {
  it("grants 20 credits on first read, exactly once per month", async () => {
    const { cookie, userId } = await signUp("wallet-grant@example.com", "Grant");

    const first = await walletRequest(cookie);
    expect(first.status).toBe(200);
    const wallet = (await first.json()) as WalletResponse;
    expect(wallet.monthly).toBe(20);
    expect(wallet.bonus).toBe(0);
    expect(wallet.available).toBe(20);
    expect(wallet.monthlyPeriodKey).toBe(periodKeyOf(new Date()));
    expect(wallet.waitlistJoined).toBe(false);

    // The snapshot and the append-only ledger must agree. Without this, a
    // mismatch between the grant amount and the wallet balance is invisible.
    const grant = (await db.select().from(creditLedger).where(eq(creditLedger.userId, userId)))
      .find((row) => row.type === "monthly_grant");
    expect(grant).toMatchObject({
      amount: 20,
      bucket: "monthly",
      periodKey: periodKeyOf(new Date()),
    });

    // Second read: no double grant.
    const second = await walletRequest(cookie);
    expect(((await second.json()) as WalletResponse).monthly).toBe(20);
  });

  it("does not double-grant under concurrent allocation", async () => {
    const { userId } = await signUp("wallet-concurrent@example.com", "Concurrent");

    // Simulate the crash window the guard exists for: the grant ledger row was
    // written, but the wallet update never landed. Every concurrent caller now
    // gets past the period-key early return and must rely on the idempotency
    // key + unique index. Without that guard these writes collide.
    await db.insert(creditWallet).values({ userId });
    await db.insert(creditLedger).values({
      userId,
      bucket: "monthly",
      type: "monthly_grant",
      amount: 20,
      periodKey: "2026-02",
      idempotencyKey: `monthly-grant:${userId}:2026-02`,
    });

    // Drive the real allocation path through six independent connections to
    // the same throwaway database so the transactions genuinely overlap.
    const sharedDb = getDb();
    const clients = Array.from({ length: 6 }, () => createTestDb({ url: process.env.DATABASE_URL! }));
    try {
      await Promise.all(
        // Keep the wait short: contending writers are tolerated by the
        // assertions below, so a long timeout would only slow the suite down.
        clients.map((client) => client.$client.execute("PRAGMA busy_timeout = 1000")),
      );
      const results = await Promise.allSettled(
        clients.map((client) => {
          // `db` is a proxy resolved at call time; swapping it here binds this
          // invocation's transaction to this client before any await happens.
          setDb({ db: client });
          return ensureMonthlyAllocation({ userId, now: FEB_2026 });
        }),
      );
      // A contending writer may be rejected by SQLite; that is fine — the
      // invariant is that no two allocations can land a grant. Any other
      // rejection is a real bug and must fail the test.
      expect(results.some((result) => result.status === "fulfilled")).toBe(true);
      for (const result of results) {
        if (result.status === "rejected") {
          const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
          expect(message).toMatch(/busy|locked/i);
        }
      }
    } finally {
      setDb({ db: sharedDb });
      for (const client of clients) client.$client.close();
    }

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
  });

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

    const grants = ledger.filter((row) => row.type === "monthly_grant");
    expect(grants).toHaveLength(2); // one per month
    expect(
      grants
        .map((row) => row.periodKey)
        .sort((a, b) => (a ?? "").localeCompare(b ?? "")),
    ).toEqual(["2026-02", "2026-03"]);
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
