import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { creditLedger } from "@repo/db/schema/credits-schema";
import { apiClient, sessionInit } from "@api/core/testing/api-client";
import { db } from "@api/db/client";
import { adminGrantCredits } from "@api/modules/credits";
import { periodKeyOf } from "@api/modules/wallet";
import {
  cleanupTouchedUsers,
  makeAdmin,
  signUp,
  walletRequest,
  type ApiError,
} from "./test-helpers";

afterAll(cleanupTouchedUsers);

describe("admin credits HTTP endpoints", () => {
  let adminCookie = "";
  let adminUserId = "";

  beforeAll(async () => {
    const admin = await signUp("credits-admin@example.com", "Admin");
    await makeAdmin("credits-admin@example.com");
    adminCookie = admin.cookie;
    adminUserId = admin.userId;
  });

  function grant(targetUserId: string, amount: number, reason: string, cookie = adminCookie) {
    return apiClient.api.admin.wallets[":userId"].credits.$post(
      { param: { userId: targetUserId }, json: { amount, reason } },
      sessionInit({ cookie }),
    );
  }

  function adjust(targetUserId: string, amount: number, reason: string) {
    return apiClient.api.admin.wallets[":userId"].$patch(
      { param: { userId: targetUserId }, json: { bucket: "bonus", amount, reason } },
      sessionInit({ cookie: adminCookie }),
    );
  }

  it("blocks non-admins", async () => {
    const { cookie, userId } = await signUp("credits-nonadmin@example.com", "NonAdmin");
    const res = await grant(userId, 1, "nope", cookie);
    expect(res.status).toBe(403);
  });

  it("requires a session for the viewer wallet", async () => {
    const res = await apiClient.api.wallet.$get();
    expect(res.status).toBe(401);
  });

  it("grants bonus credits over HTTP and records who did it", async () => {
    // Each case owns its target so the suite does not depend on test order.
    const { userId } = await signUp("credits-grant-target@example.com", "GrantTarget");
    const res = await grant(userId, 7, "support make-good");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { wallet: { bonusBalance: number } };
    expect(body.wallet.bonusBalance).toBe(7);

    const rows = await db.select().from(creditLedger).where(eq(creditLedger.userId, userId));
    const grantRow = rows.find((row) => row.type === "admin_grant");
    expect(grantRow).toMatchObject({
      amount: 7,
      reason: "support make-good",
      createdByUserId: adminUserId,
    });
  });

  it("adjusts with a signed amount over HTTP", async () => {
    const { userId } = await signUp("credits-adjust-target@example.com", "AdjustTarget");
    await grant(userId, 7, "seed");

    const res = await adjust(userId, -2, "fix");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { wallet: { bonusBalance: number } };
    expect(body.wallet.bonusBalance).toBe(5);

    const below = await adjust(userId, -99, "greedy");
    expect(below.status).toBe(400);
    expect(((await below.json()) as ApiError).error.code).toBe("ADJUSTMENT_BELOW_ZERO");
  });

  it("returns the user's wallet and ledger for admins", async () => {
    const email = "credits-view-target@example.com";
    const { userId } = await signUp(email, "ViewTarget");
    await adminGrantCredits({ userId, amount: 5, reason: "seed", adminUserId: userId });

    const res = await apiClient.api.admin.wallets[":userId"].$get(
      { param: { userId } },
      sessionInit({ cookie: adminCookie }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { email: string };
      wallet: { monthly: number; bonus: number };
    };
    expect(body.user.email).toBe(email);
    expect(body.wallet.bonus).toBe(5);

    const ledgerRes = await apiClient.api.admin.wallets[":userId"].credits.$get(
      { param: { userId }, query: { page: "1", perPage: "20" } },
      sessionInit({ cookie: adminCookie }),
    );
    expect(ledgerRes.status).toBe(200);
    const ledger = (await ledgerRes.json()) as {
      items: Array<{ type: string }>;
      pagination: { total: number };
    };
    expect(ledger.items.length).toBeGreaterThan(0);

    const missing = await apiClient.api.admin.wallets[":userId"].$get(
      { param: { userId: "no-such-user" } },
      sessionInit({ cookie: adminCookie }),
    );
    expect(missing.status).toBe(404);
  });

  it("serves the viewer ledger with pagination", async () => {
    const { cookie, userId } = await signUp("credits-ledger-target@example.com", "LedgerTarget");
    await walletRequest(cookie); // trigger allocation first
    await adminGrantCredits({
      userId,
      amount: 1,
      reason: "ledger row 1",
      adminUserId: userId,
    });
    await adminGrantCredits({
      userId,
      amount: 1,
      reason: "ledger row 2",
      adminUserId: userId,
    });

    // Three rows (one grant + two admin grants) so a lost LIMIT is visible.
    const res = await apiClient.api.credits.$get(
      { query: { page: "1", perPage: "2" } },
      sessionInit({ cookie }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ type: string }>;
      pagination: { page: number; perPage: number; total: number; totalPages: number };
      periodKey: string;
    };
    expect(body.items).toHaveLength(2);
    expect(body.pagination).toMatchObject({ page: 1, perPage: 2, total: 3, totalPages: 2 });
    expect(body.periodKey).toBe(periodKeyOf(new Date()));

    const second = await apiClient.api.credits.$get(
      { query: { page: "2", perPage: "2" } },
      sessionInit({ cookie }),
    );
    expect(((await second.json()) as { items: unknown[] }).items).toHaveLength(1);
  });
});
