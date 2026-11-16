import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../app";
import { adminGrantCredits } from "./wallet";
import { periodKeyOf } from "./wallet";
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
  let userCookie = "";
  let targetUserId = "";

  beforeAll(async () => {
    const admin = await signUp("credits-admin@example.com", "Admin");
    await makeAdmin("credits-admin@example.com");
    adminCookie = admin.cookie;
    const plain = await signUp("credits-plain@example.com", "Plain");
    userCookie = plain.cookie;
    targetUserId = plain.userId;
  });

  it("blocks non-admins", async () => {
    const res = await app.request("/api/admin/credits/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userCookie },
      body: JSON.stringify({ userId: targetUserId, amount: 1, reason: "nope" }),
    });
    expect(res.status).toBe(403);
  });

  it("requires a session for the viewer wallet", async () => {
    const res = await app.request("/api/credits", { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("grants bonus credits over HTTP and audits it", async () => {
    const res = await app.request("/api/admin/credits/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ userId: targetUserId, amount: 7, reason: "support make-good" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { wallet: { bonusBalance: number } };
    expect(body.wallet.bonusBalance).toBe(7);
  });

  it("adjusts with a signed amount over HTTP", async () => {
    const res = await app.request("/api/admin/credits/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ userId: targetUserId, bucket: "bonus", amount: -2, reason: "fix" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { wallet: { bonusBalance: number } };
    expect(body.wallet.bonusBalance).toBe(5);

    const below = await app.request("/api/admin/credits/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({
        userId: targetUserId,
        bucket: "bonus",
        amount: -99,
        reason: "greedy",
      }),
    });
    expect(below.status).toBe(400);
    expect(((await below.json()) as ApiError).error.code).toBe("ADJUSTMENT_BELOW_ZERO");
  });

  it("returns the user's wallet and ledger for admins", async () => {
    const res = await app.request(`/api/admin/credits/user/${targetUserId}`, {
      method: "GET",
      headers: { cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { email: string };
      wallet: { monthly: number; bonus: number };
      ledger: { items: Array<{ type: string }>; pagination: { total: number } };
    };
    expect(body.user.email).toBe("credits-plain@example.com");
    expect(body.wallet.bonus).toBe(5);
    expect(body.ledger.items.length).toBeGreaterThan(0);

    const missing = await app.request("/api/admin/credits/user/no-such-user", {
      method: "GET",
      headers: { cookie: adminCookie },
    });
    expect(missing.status).toBe(404);
  });

  it("serves the viewer ledger with pagination", async () => {
    await walletRequest(userCookie); // trigger allocation first
    await adminGrantCredits({
      userId: targetUserId,
      amount: 1,
      reason: "ledger row",
      adminUserId: targetUserId,
    });

    const res = await app.request("/api/credits/ledger?page=1&perPage=2", {
      method: "GET",
      headers: { cookie: userCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ type: string }>;
      pagination: { page: number; perPage: number; total: number };
      periodKey: string;
    };
    expect(body.items.length).toBeLessThanOrEqual(2);
    expect(body.pagination.perPage).toBe(2);
    expect(body.periodKey).toBe(periodKeyOf(new Date()));
  });
});
