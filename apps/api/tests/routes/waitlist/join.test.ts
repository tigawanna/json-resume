import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { waitlistEntry } from "@repo/db/schema/credits-schema";
import { db } from "@api/db/client";
import {
  type ApiError,
  type JoinResponse,
  cleanupTouchedRecords,
  emailFor,
  joinWaitlist,
} from "./helpers";

afterAll(cleanupTouchedRecords);

describe("POST /api/waitlist (public join)", () => {
  it("normalizes the email and stores the entry", async () => {
    const email = emailFor({ label: "normalize" });
    const res = await joinWaitlist({
      email: `  ${email.toUpperCase()}  `,
      body: { name: "Tester" },
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as JoinResponse).toEqual({ joined: true });

    const [row] = await db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, email))
      .limit(1);
    expect(row).toBeDefined();
    expect(row!.status).toBe("joined");
    expect(row!.source).toBe("landing");
    expect(row!.name).toBe("Tester");
    expect(row!.userId).toBeNull();
    expect(row!.claimedAt).toBeNull();
    expect(row!.consentAt).toBeTruthy();
  });

  it("returns the same response for a duplicate email without a second row", async () => {
    const email = emailFor({ label: "duplicate" });
    const first = await joinWaitlist({ email, body: { name: "First Name" } });
    const second = await joinWaitlist({
      email,
      body: { name: "Second Name", source: "waitlist-page" },
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await second.json()) as JoinResponse).toEqual((await first.json()) as JoinResponse);

    const rows = await db.select().from(waitlistEntry).where(eq(waitlistEntry.email, email));
    expect(rows).toHaveLength(1);
    // Duplicates never overwrite the original submission.
    expect(rows[0]!.name).toBe("First Name");
    expect(rows[0]!.source).toBe("landing");
  });

  it("keeps a single row when two joins race for the same email", async () => {
    const email = emailFor({ label: "race" });
    const responses = await Promise.all([
      joinWaitlist({ email }),
      joinWaitlist({ email, body: { source: "waitlist-page" } }),
    ]);
    expect(responses.map((res) => res.status)).toEqual([200, 200]);

    const rows = await db.select().from(waitlistEntry).where(eq(waitlistEntry.email, email));
    expect(rows).toHaveLength(1);
  });

  it("silently accepts honeypot submissions without writing a row", async () => {
    const email = emailFor({ label: "bot" });
    const res = await joinWaitlist({ email, body: { website: "http://spam.example" } });
    expect(res.status).toBe(200);
    expect((await res.json()) as JoinResponse).toEqual({ joined: true });

    const rows = await db.select().from(waitlistEntry).where(eq(waitlistEntry.email, email));
    expect(rows).toHaveLength(0);
  });

  it("ignores a whitespace-only honeypot and does store the entry", async () => {
    const email = emailFor({ label: "not-a-bot" });
    const res = await joinWaitlist({ email, body: { website: "   " } });
    expect(res.status).toBe(200);

    const rows = await db.select().from(waitlistEntry).where(eq(waitlistEntry.email, email));
    expect(rows).toHaveLength(1);
  });

  it("rejects an invalid email, missing consent, or reserved source", async () => {
    const badEmail = await joinWaitlist({ email: "not-an-email" });
    expect(badEmail.status).toBe(400);
    expect(((await badEmail.json()) as ApiError).error.code).toBe("VALIDATION_ERROR");

    const noConsent = await joinWaitlist({
      email: emailFor({ label: "no-consent" }),
      body: { consent: false },
    });
    expect(noConsent.status).toBe(400);

    const adminSource = await joinWaitlist({
      email: emailFor({ label: "admin-source" }),
      body: { source: "admin" },
    });
    expect(adminSource.status).toBe(400);

    const blankName = await joinWaitlist({
      email: emailFor({ label: "blank-name" }),
      body: { name: "   " },
    });
    expect(blankName.status).toBe(400);
  });
});
