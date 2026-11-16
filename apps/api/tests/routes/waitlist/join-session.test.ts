import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { user } from "@repo/db/schema/auth-schema";
import { waitlistEntry } from "@repo/db/schema/credits-schema";
import { db } from "@api/db/client";
import { cleanupTouchedRecords, emailFor, joinWaitlist, signUp } from "./helpers";

afterAll(cleanupTouchedRecords);

describe("POST /api/waitlist (signed-in visitors)", () => {
  it("links a signed-in session whose email matches", async () => {
    const account = await signUp({ label: "session-link", name: "Session Linker" });
    const res = await joinWaitlist({ email: account.email, cookie: account.cookie });
    expect(res.status).toBe(200);

    const [row] = await db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, account.email))
      .limit(1);
    expect(row!.userId).toBe(account.userId);
    expect(row!.claimedAt).toBeTruthy();
  });

  it("claims an existing unclaimed entry instead of inserting a duplicate", async () => {
    const email = emailFor({ label: "late-link" });
    await joinWaitlist({ email });

    const account = await signUp({ label: "late-link", email, name: "Late Linker" });
    const res = await joinWaitlist({ email, cookie: account.cookie });
    expect(res.status).toBe(200);

    const rows = await db.select().from(waitlistEntry).where(eq(waitlistEntry.email, email));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userId).toBe(account.userId);
    expect(rows[0]!.claimedAt).toBeTruthy();
  });

  it("does not link a signed-in session for a banned user", async () => {
    const account = await signUp({ label: "banned", name: "Banned User" });
    await db.update(user).set({ banned: true }).where(eq(user.id, account.userId));

    const res = await joinWaitlist({ email: account.email, cookie: account.cookie });
    expect(res.status).toBe(200);

    const [row] = await db
      .select()
      .from(waitlistEntry)
      .where(eq(waitlistEntry.email, account.email))
      .limit(1);
    expect(row!.userId).toBeNull();
  });
});
