import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { user } from "@repo/db/schema/auth-schema";
import { creditLedger } from "@repo/db/schema/credits-schema";
import { resume } from "@repo/db/schema/resume";
import { syncEvent } from "@repo/db/schema/sync-schema";
import { apiClient, sessionInit } from "@api/core/testing/api-client";
import { db } from "../../../db/client";
import { adminAdjustCredits, adminGrantCredits } from "@api/modules/credits";
import { ensureMonthlyAllocation } from "@api/modules/wallet";
import {
  cleanupTouchedUsers,
  MAR_2026,
  signUp,
  makeAdmin,
  type WalletResponse,
} from "@api/modules/credits/tests/test-helpers";
import realEvents from "./test-fixtures/resume-projection-events.json";
import { toSyncEvent, type FixtureEvent } from "./test-fixtures/to-sync-event";
import { projectUnappliedSyncEvents } from "./project-legacy.server";

afterAll(cleanupTouchedUsers);

// A real résumé insert shape, retargeted to a fresh id and a post-startAt
// creation time so the sync is a chargeable "new résumé" rather than a legacy
// import. ids/relationships/column shapes come from the recorded event.
const insertTemplate = (realEvents as { events: FixtureEvent[] }).events.find(
  (event) => event.collectionId === "resume" && event.type === "insert",
)!;
const POST_START_AT = Date.parse("2026-11-20T12:00:00.000Z");
const EMAIL = "journey-user@example.com";

async function syncResume(userId: string, resumeId: string) {
  await db.insert(syncEvent).values(
    toSyncEvent(
      {
        ...insertTemplate,
        key: resumeId,
        payload: {
          ...insertTemplate.payload,
          id: resumeId,
          createdAt: POST_START_AT,
          updatedAt: POST_START_AT,
        },
      },
      userId,
    ),
  );
  const result = await projectUnappliedSyncEvents(1);
  expect(result).toMatchObject({ projected: 1, failed: 0 });
}

function ledgerFor(userId: string) {
  return db.select().from(creditLedger).where(eq(creditLedger.userId, userId));
}

async function walletFor(cookie: string) {
  const res = await apiClient.api.wallet.$get(undefined, sessionInit({ cookie }));
  expect(res.status).toBe(200);
  return (await res.json()) as WalletResponse;
}

describe("a user syncing résumés across account states", () => {
  it("keeps data and credits coherent from signup through ban, overdraft, bonus and rollover", async () => {
    const { userId, cookie } = await signUp(EMAIL, "Journey User");
    const admin = await signUp("journey-admin@example.com", "Journey Admin");
    await makeAdmin("journey-admin@example.com");

    // State 1 — new account, joined waitlist: first sync triggers allocation
    // and charges one real credit.
    const joined = await apiClient.api.waitlist.$post(
      { json: { email: EMAIL, consent: true, source: "landing" } },
      sessionInit({ cookie }),
    );
    expect(joined.status).toBe(200);

    await syncResume(userId, "journey-resume-1");
    expect(await walletFor(cookie)).toMatchObject({
      monthly: 19,
      bonus: 0,
      waitlistJoined: true,
    });
    expect((await ledgerFor(userId)).filter((r) => r.type === "resume_spend")).toHaveLength(1);

    // State 2 — the client reconnects and replays the same insert: a rebuild
    // must not charge twice.
    await syncResume(userId, "journey-resume-1");
    expect((await walletFor(cookie)).monthly).toBe(19);
    expect((await ledgerFor(userId)).filter((r) => r.type === "resume_spend")).toHaveLength(1);

    // State 3 — monthly balance clawed back to zero: the résumé still lands,
    // and the charge becomes an overdraft instead of lost data.
    await adminAdjustCredits({
      userId,
      bucket: "monthly",
      amount: -19,
      reason: "journey drain",
      adminUserId: admin.userId,
    });
    await syncResume(userId, "journey-resume-2");
    const overdrafts = (await ledgerFor(userId)).filter((r) => r.type === "resume_overdraft");
    expect(overdrafts).toMatchObject([
      { resumeId: "journey-resume-2", idempotencyKey: "resume:journey-resume-2", amount: 0 },
    ]);

    // State 4 — banned: no allocation, but syncing still projects the résumé.
    await db.update(user).set({ banned: true }).where(eq(user.id, userId));
    await syncResume(userId, "journey-resume-3");
    expect((await ledgerFor(userId)).filter((r) => r.type === "resume_overdraft")).toHaveLength(2);
    expect(
      (await db.select({ id: resume.id }).from(resume).where(eq(resume.userId, userId))).map(
        (r) => r.id,
      ),
    ).toContain("journey-resume-3");

    // State 5 — unbanned with an admin bonus grant: the next sync spends the
    // bonus while the exhausted monthly bucket is skipped.
    await db.update(user).set({ banned: false }).where(eq(user.id, userId));
    await adminGrantCredits({
      userId,
      amount: 5,
      reason: "journey make-good",
      adminUserId: admin.userId,
    });
    await syncResume(userId, "journey-resume-4");
    expect(await walletFor(cookie)).toMatchObject({ monthly: 0, bonus: 4 });
    expect(
      (await ledgerFor(userId)).filter((r) => r.type === "resume_spend" && r.bucket === "bonus"),
    ).toHaveLength(1);

    // State 6 — a new month: the grant lands, the overdrafts stay on the
    // ledger for audit, and no résumé from any state was dropped.
    const rolled = await ensureMonthlyAllocation({ userId, now: MAR_2026 });
    expect(rolled).toMatchObject({ granted: true, expired: 0, wallet: { monthlyBalance: 20 } });
    expect(
      await db.select({ id: resume.id }).from(resume).where(eq(resume.userId, userId)),
    ).toHaveLength(4);
  });
});
