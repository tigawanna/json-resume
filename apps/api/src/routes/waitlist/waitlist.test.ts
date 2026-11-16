import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { app } from "../../app";
import { db } from "../../db/client";
import { user } from "@repo/db/schema/auth-schema";
import { waitlistEntry } from "@repo/db/schema/credits-schema";

type JoinResponse = { joined: boolean };
type ApiError = { error: { message: string; code?: string } };

const touchedEmails: string[] = [];
const touchedUserEmails: string[] = [];

async function signUp(email: string, name: string) {
  const res = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123", name }),
  });
  expect(res.status).toBe(200);
  touchedUserEmails.push(email);
  return res.headers.get("set-cookie")!.split(";")[0]!;
}

async function makeAdmin(email: string) {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  await db.update(user).set({ role: "admin" }).where(eq(user.id, row!.id));
}

afterAll(async () => {
  if (touchedEmails.length > 0) {
    await db
      .delete(waitlistEntry)
      .where(inArray(waitlistEntry.email, touchedEmails.map((email) => email.toLowerCase())));
  }
  for (const email of touchedUserEmails) {
    await db.delete(user).where(eq(user.email, email));
  }
});

describe("POST /api/waitlist (public join)", () => {
  it("normalizes the email and stores the entry", async () => {
    const email = "  Join.Me+Phase1@EXAMPLE.com ";
    touchedEmails.push("join.me+phase1@example.com");

    const res = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: "Tester", consent: true, source: "landing" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as JoinResponse).toEqual({ joined: true });

    const [row] = await db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, "join.me+phase1@example.com"))
      .limit(1);
    expect(row).toBeDefined();
    expect(row!.status).toBe("joined");
    expect(row!.name).toBe("Tester");
    expect(row!.userId).toBeNull();
  });

  it("returns the same response for a duplicate email without a second row", async () => {
    const email = "dup@example.com";
    touchedEmails.push(email);

    const first = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, consent: true, source: "landing" }),
    });
    const second = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, consent: true, source: "waitlist-page" }),
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await second.json()) as JoinResponse).toEqual((await first.json()) as JoinResponse);

    const rows = await db.select().from(waitlistEntry).where(eq(waitlistEntry.email, email));
    expect(rows).toHaveLength(1);
  });

  it("silently accepts honeypot submissions without writing a row", async () => {
    const email = "bot@example.com";
    const res = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        consent: true,
        source: "landing",
        website: "http://spam.example",
      }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as JoinResponse).toEqual({ joined: true });

    const rows = await db.select().from(waitlistEntry).where(eq(waitlistEntry.email, email));
    expect(rows).toHaveLength(0);
  });

  it("rejects an invalid email or missing consent with a validation error", async () => {
    const badEmail = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", consent: true, source: "landing" }),
    });
    expect(badEmail.status).toBe(400);
    expect(((await badEmail.json()) as ApiError).error.code).toBe("VALIDATION_ERROR");

    const noConsent = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "no-consent@example.com", source: "landing" }),
    });
    expect(noConsent.status).toBe(400);

    const adminSource = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin-source@example.com", consent: true, source: "admin" }),
    });
    expect(adminSource.status).toBe(400);
  });

  it("links a signed-in session whose email matches", async () => {
    const email = "session-link@example.com";
    touchedEmails.push(email);
    const cookie = await signUp(email, "Session Linker");

    const res = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ email, consent: true, source: "landing" }),
    });
    expect(res.status).toBe(200);

    const [row] = await db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, email))
      .limit(1);
    expect(row!.userId).toBeTruthy();
    expect(row!.claimedAt).toBeTruthy();
  });
});

describe("POST /api/waitlist/claim (signed-in claim)", () => {
  it("links an unclaimed entry by email, idempotently", async () => {
    const email = "claim@example.com";
    touchedEmails.push(email);

    // Anonymous join first, then the account is created later.
    const join = await app.request("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, consent: true, source: "landing" }),
    });
    expect(join.status).toBe(200);

    const cookie = await signUp(email, "Claimer");

    const first = await app.request("/api/waitlist/claim", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(first.status).toBe(200);
    expect((await first.json()) as { claimed: boolean }).toEqual({ claimed: true });

    const [row] = await db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, email))
      .limit(1);
    expect(row!.userId).toBeTruthy();
    expect(row!.claimedAt).toBeTruthy();

    // Second claim is a no-op; the entry keeps the first owner.
    const second = await app.request("/api/waitlist/claim", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(second.status).toBe(200);
    expect((await second.json()) as { claimed: boolean }).toEqual({ claimed: false });
  });

  it("never steals an entry already linked to another user", async () => {
    const email = "taken@example.com";
    touchedEmails.push(email);
    const firstCookie = await signUp(email, "First Owner");
    await makeAdmin(email);
    // First owner claims via a signed-in join.
    await app.request("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: firstCookie },
      body: JSON.stringify({ email, consent: true, source: "landing" }),
    });

    const otherEmail = "other-claim@example.com";
    const otherCookie = await signUp(otherEmail, "Other Claimer");
    touchedUserEmails.push(otherEmail);

    const res = await app.request("/api/waitlist/claim", {
      method: "POST",
      headers: { Cookie: otherCookie },
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as { claimed: boolean }).toEqual({ claimed: false });

    const [row] = await db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, email))
      .limit(1);
    expect(row!.userId).not.toBeNull();
  });

  it("returns 401 without a session", async () => {
    const res = await app.request("/api/waitlist/claim", { method: "POST" });
    expect(res.status).toBe(401);
  });
});

describe("waitlist admin endpoints", () => {
  let adminCookie: string;
  const adminEmail = `waitlist-admin+${Date.now()}@example.com`;
  const seedEmails = ["alpha@example.com", "beta@example.com", "gamma@example.com"];

  beforeAll(async () => {
    adminCookie = await signUp(adminEmail, "Admin");
    await makeAdmin(adminEmail);
    for (const email of seedEmails) {
      touchedEmails.push(email);
      await db.insert(waitlistEntry).values({
        email,
        name: email.split("@")[0],
        source: "admin",
        consentAt: new Date(),
        status: email === "gamma@example.com" ? "removed" : "joined",
      });
    }
  });

  it("rejects anonymous and non-admin access", async () => {
    const anonymous = await app.request("/api/admin/waitlist/entries");
    expect(anonymous.status).toBe(401);

    const memberEmail = `waitlist-member+${Date.now()}@example.com`;
    const memberCookie = await signUp(memberEmail, "Member");
    const forbidden = await app.request("/api/admin/waitlist/entries", {
      headers: { Cookie: memberCookie },
    });
    expect(forbidden.status).toBe(403);
  });

  it("lists entries with pagination, search, and filters", async () => {
    const res = await app.request(
      "/api/admin/waitlist/entries?page=1&perPage=2&q=example.com&status=joined",
      { headers: { Cookie: adminCookie } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ email: string; status: string }>;
      pagination: { page: number; total: number; totalPages: number };
    };
    expect(body.pagination.page).toBe(1);
    expect(body.items).toHaveLength(2);
    expect(body.items.every((entry) => entry.status === "joined")).toBe(true);

    const secondPage = await app.request("/api/admin/waitlist/entries?page=2&perPage=2", {
      headers: { Cookie: adminCookie },
    });
    const secondBody = (await secondPage.json()) as typeof body;
    expect(secondBody.items.length).toBeGreaterThan(0);
    expect(secondBody.pagination.totalPages).toBeGreaterThan(1);

    const noAccount = await app.request("/api/admin/waitlist/entries?hasAccount=false&q=alpha", {
      headers: { Cookie: adminCookie },
    });
    const noAccountBody = (await noAccount.json()) as typeof body;
    expect(noAccountBody.items.map((entry) => entry.email)).toContain("alpha@example.com");
  });

  it("removes, restores, links, and unlinks an entry", async () => {
    const [entry] = await db
      .select({ id: waitlistEntry.id })
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, "beta@example.com"))
      .limit(1);

    const remove = await app.request(`/api/admin/waitlist/entries/${entry!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ status: "removed", notes: "requested removal" }),
    });
    expect(remove.status).toBe(200);
    const removedBody = (await remove.json()) as { entry: { status: string; notes: string | null } };
    expect(removedBody.entry.status).toBe("removed");
    expect(removedBody.entry.notes).toBe("requested removal");

    const restore = await app.request(`/api/admin/waitlist/entries/${entry!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ status: "joined" }),
    });
    expect(((await restore.json()) as { entry: { status: string } }).entry.status).toBe("joined");
  });

  it("rejects linking an unknown user and unlinks an existing link", async () => {
    const [entry] = await db
      .select({ id: waitlistEntry.id })
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, "alpha@example.com"))
      .limit(1);

    const unknownUser = await app.request(`/api/admin/waitlist/entries/${entry!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ userId: "nonexistent-user-id" }),
    });
    expect(unknownUser.status).toBe(404);

    const [adminUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);

    const link = await app.request(`/api/admin/waitlist/entries/${entry!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ userId: adminUser!.id }),
    });
    expect(link.status).toBe(200);
    expect(((await link.json()) as { entry: { userId: string | null } }).entry.userId).toBe(
      adminUser!.id,
    );

    const unlink = await app.request(`/api/admin/waitlist/entries/${entry!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ userId: null }),
    });
    expect(((await unlink.json()) as { entry: { userId: string | null } }).entry.userId).toBeNull();
  });

  it("returns 404 for a missing entry", async () => {
    const res = await app.request("/api/admin/waitlist/entries/no-such-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ status: "removed" }),
    });
    expect(res.status).toBe(404);
  });

  it("exports every entry as CSV", async () => {
    const res = await app.request("/api/admin/waitlist/export", {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const csv = await res.text();
    expect(csv).toContain("alpha@example.com");
    expect(csv.split("\n")[0]).toContain("email,name,status,source");
  });

  it("returns stats for the admin home card", async () => {
    const res = await app.request("/api/admin/waitlist/stats", {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { joined: number; linked: number; removed: number };
    expect(body.joined).toBeGreaterThan(0);
    expect(body.removed).toBeGreaterThan(0);
  });
});
