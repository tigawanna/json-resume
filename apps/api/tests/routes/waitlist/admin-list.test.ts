import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiClient, sessionInit } from "@api/core/testing/api-client";
import { adminToken, cleanupTouchedRecords, makeAdmin, seedEntry, signUp } from "./helpers";

afterAll(cleanupTouchedRecords);

describe("GET /api/admin/waitlist/entries", () => {
  let adminCookie = "";
  let memberCookie = "";
  let alpha: { id: string; email: string };
  let beta: { id: string; email: string };
  let gamma: { id: string; email: string };
  let delta: { id: string; email: string };

  beforeAll(async () => {
    const admin = await signUp({ label: "list-admin", name: "Admin" });
    await makeAdmin({ email: admin.email });
    adminCookie = admin.cookie;

    const member = await signUp({ label: "list-member", name: "Member" });
    memberCookie = member.cookie;

    alpha = await seedEntry({ label: "alpha", name: "Alpha", userId: admin.userId });
    beta = await seedEntry({ label: "beta", name: "Beta" });
    gamma = await seedEntry({ label: "gamma", name: "Gamma", status: "removed" });
    delta = await seedEntry({ label: "delta", name: "Delta" });
  });

  it("rejects anonymous and non-admin access", async () => {
    const anonymous = await apiClient.api.admin.waitlist.entries.$get({ query: {} });
    expect(anonymous.status).toBe(401);

    const member = await apiClient.api.admin.waitlist.entries.$get(
      { query: {} },
      sessionInit({ cookie: memberCookie }),
    );
    expect(member.status).toBe(403);
    const forbidden: unknown = await member.json();
    expect(forbidden).toMatchObject({ error: { code: "FORBIDDEN" } });

    const memberExport = await apiClient.api.admin.waitlist.export.$get(
      undefined,
      sessionInit({ cookie: memberCookie }),
    );
    expect(memberExport.status).toBe(403);
  });

  it("lists entries with pagination, search, and filters", async () => {
    const firstPage = await apiClient.api.admin.waitlist.entries.$get(
      { query: { q: adminToken, status: "joined", page: "1", perPage: "2" } },
      sessionInit({ cookie: adminCookie }),
    );
    expect(firstPage.status).toBe(200);
    if (!firstPage.ok) throw new Error("expected a waitlist page");
    const page = await firstPage.json();
    expect(page.items).toHaveLength(2);
    expect(page.items.every((entry) => entry.status === "joined")).toBe(true);
    expect(page.items.every((entry) => entry.email.includes(adminToken))).toBe(true);
    expect(page.pagination).toEqual({ page: 1, perPage: 2, total: 3, totalPages: 2 });

    const secondPage = await apiClient.api.admin.waitlist.entries.$get(
      { query: { q: adminToken, status: "joined", page: "2", perPage: "2" } },
      sessionInit({ cookie: adminCookie }),
    );
    if (!secondPage.ok) throw new Error("expected a second waitlist page");
    const secondBody = await secondPage.json();
    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.pagination.page).toBe(2);

    const linked = await apiClient.api.admin.waitlist.entries.$get(
      { query: { q: adminToken, hasAccount: "true" } },
      sessionInit({ cookie: adminCookie }),
    );
    if (!linked.ok) throw new Error("expected linked entries");
    const linkedBody = await linked.json();
    expect(linkedBody.items.map((entry) => entry.email)).toEqual([alpha.email]);
    expect(linkedBody.items[0]!.userEmail).toBeTruthy();

    const unlinked = await apiClient.api.admin.waitlist.entries.$get(
      { query: { q: adminToken, hasAccount: "false", status: "joined" } },
      sessionInit({ cookie: adminCookie }),
    );
    if (!unlinked.ok) throw new Error("expected unlinked entries");
    const unlinkedBody = await unlinked.json();
    expect(unlinkedBody.items.map((entry) => entry.email).sort()).toEqual(
      [beta.email, delta.email].sort(),
    );

    const removed = await apiClient.api.admin.waitlist.entries.$get(
      { query: { q: adminToken, status: "removed" } },
      sessionInit({ cookie: adminCookie }),
    );
    if (!removed.ok) throw new Error("expected removed entries");
    const removedBody = await removed.json();
    expect(removedBody.items.map((entry) => entry.email)).toEqual([gamma.email]);
  });
});
