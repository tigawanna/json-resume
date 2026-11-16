import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "@api/app";
import {
  type ApiError,
  type EntryPage,
  adminToken,
  cleanupTouchedRecords,
  makeAdmin,
  seedEntry,
  signUp,
} from "./helpers";

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
    const anonymous = await app.request("/api/admin/waitlist/entries");
    expect(anonymous.status).toBe(401);

    const member = await app.request("/api/admin/waitlist/entries", {
      headers: { Cookie: memberCookie },
    });
    expect(member.status).toBe(403);
    expect(((await member.json()) as ApiError).error.code).toBe("FORBIDDEN");

    const memberExport = await app.request("/api/admin/waitlist/export", {
      headers: { Cookie: memberCookie },
    });
    expect(memberExport.status).toBe(403);
  });

  it("lists entries with pagination, search, and filters", async () => {
    const firstPage = await app.request(
      `/api/admin/waitlist/entries?q=${adminToken}&status=joined&page=1&perPage=2`,
      { headers: { Cookie: adminCookie } },
    );
    expect(firstPage.status).toBe(200);
    const page = (await firstPage.json()) as EntryPage;
    expect(page.items).toHaveLength(2);
    expect(page.items.every((entry) => entry.status === "joined")).toBe(true);
    expect(page.items.every((entry) => entry.email.includes(adminToken))).toBe(true);
    expect(page.pagination).toEqual({ page: 1, perPage: 2, total: 3, totalPages: 2 });

    const secondPage = await app.request(
      `/api/admin/waitlist/entries?q=${adminToken}&status=joined&page=2&perPage=2`,
      { headers: { Cookie: adminCookie } },
    );
    const secondBody = (await secondPage.json()) as EntryPage;
    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.pagination.page).toBe(2);

    const linked = await app.request(
      `/api/admin/waitlist/entries?q=${adminToken}&hasAccount=true`,
      { headers: { Cookie: adminCookie } },
    );
    const linkedBody = (await linked.json()) as EntryPage;
    expect(linkedBody.items.map((entry) => entry.email)).toEqual([alpha.email]);
    expect(linkedBody.items[0]!.userEmail).toBeTruthy();

    const unlinked = await app.request(
      `/api/admin/waitlist/entries?q=${adminToken}&hasAccount=false&status=joined`,
      { headers: { Cookie: adminCookie } },
    );
    const unlinkedBody = (await unlinked.json()) as EntryPage;
    expect(unlinkedBody.items.map((entry) => entry.email).sort()).toEqual(
      [beta.email, delta.email].sort(),
    );

    const removed = await app.request(
      `/api/admin/waitlist/entries?q=${adminToken}&status=removed`,
      { headers: { Cookie: adminCookie } },
    );
    const removedBody = (await removed.json()) as EntryPage;
    expect(removedBody.items.map((entry) => entry.email)).toEqual([gamma.email]);
  });
});
