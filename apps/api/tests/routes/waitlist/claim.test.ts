import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { waitlistEntry } from "@repo/db/schema/credits-schema";
import { db } from "@api/db/client";
import {
  type ClaimResponse,
  claimWaitlist,
  cleanupTouchedRecords,
  emailFor,
  forgetTrackedEmail,
  joinWaitlist,
  seedEntry,
  signUp,
} from "./helpers";

afterAll(cleanupTouchedRecords);

describe("POST /api/waitlist/claim", () => {
  it("links an unclaimed entry by email, idempotently", async () => {
    const email = emailFor({ label: "claim" });
    // Anonymous join first, then the account is created later.
    await joinWaitlist({ email });
    const account = await signUp({ label: "claim", email, name: "Claimer" });

    const first = await claimWaitlist({ cookie: account.cookie });
    expect(first.status).toBe(200);
    expect((await first.json()) as ClaimResponse).toEqual({ claimed: true });

    const [row] = await db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, email))
      .limit(1);
    expect(row!.userId).toBe(account.userId);
    expect(row!.claimedAt).toBeTruthy();

    // Second claim is a no-op; the entry keeps the first owner.
    const second = await claimWaitlist({ cookie: account.cookie });
    expect(second.status).toBe(200);
    expect((await second.json()) as ClaimResponse).toEqual({ claimed: false });
  });

  it("returns claimed false when the user has no waitlist entry", async () => {
    const account = await signUp({ label: "claim-missing", name: "No Entry" });
    const res = await claimWaitlist({ cookie: account.cookie });
    expect(res.status).toBe(200);
    expect((await res.json()) as ClaimResponse).toEqual({ claimed: false });
  });

  it("never steals an entry already linked to another user", async () => {
    const owner = await signUp({ label: "claim-owner", name: "Owner" });
    const claimer = await signUp({ label: "claim-other", name: "Claimer" });
    const seeded = await seedEntry({
      label: "already-linked",
      name: "Linked",
      userId: owner.userId,
    });
    await db
      .update(waitlistEntry)
      .set({ email: claimer.email })
      .where(eq(waitlistEntry.id, seeded.id));
    forgetTrackedEmail({ email: seeded.email });

    const res = await claimWaitlist({ cookie: claimer.cookie });
    expect(res.status).toBe(200);
    expect((await res.json()) as ClaimResponse).toEqual({ claimed: false });

    const [row] = await db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, claimer.email))
      .limit(1);
    expect(row!.userId).toBe(owner.userId);
  });

  it("returns 401 without a session", async () => {
    const res = await claimWaitlist();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });
});
