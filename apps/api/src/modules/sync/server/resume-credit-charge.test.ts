import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { user } from "@repo/db/schema/auth-schema";
import { creditLedger, creditWallet } from "@repo/db/schema/credits-schema";
import { ensureMonthlyAllocation } from "../../../routes/credits/wallet";
import { cleanupTouchedUsers, FEB_2026, signUp } from "../../../routes/credits/test-helpers";
import { tablesByCollection } from "./project-legacy.server";
import {
  chargeProjectedResume,
  isChargeableResumeInsert,
  type CreditChargePolicy,
} from "./resume-credit-charge";

afterAll(cleanupTouchedUsers);

const ENABLED: CreditChargePolicy = { enabled: true, startAt: undefined };

function ledgerFor(userId: string) {
  return db.select().from(creditLedger).where(eq(creditLedger.userId, userId));
}

describe("isChargeableResumeInsert", () => {
  it("charges only a new résumé row", () => {
    expect(isChargeableResumeInsert("resume", "insert")).toBe(true);
    expect(isChargeableResumeInsert("resume", "update")).toBe(false);
    expect(isChargeableResumeInsert("resume", "delete")).toBe(false);
  });

  it("never charges résumé children or user-level rows, for any event type", () => {
    // Plan §1.2: everything hanging off a resumeId, plus library/job rows, is free.
    const resumeChildren = [
      "resumeExperience",
      "resumeExperienceBullet",
      "resumeEducation",
      "resumeEducationBullet",
      "resumeSkillGroup",
      "resumeSkill",
      "resumeContact",
      "resumeProject",
      "resumeSummary",
      "resumeNote",
      "resumeLink",
      "resumeLanguage",
      "resumeCertification",
      "resumeVolunteer",
      "resumeTalk",
      "resumeAiChat",
      "resumeAiConversation",
      "resumeAiMessage",
    ];
    const userLevelRows = [
      "savedProject",
      "job",
      "coverLetter",
      "applicationAnswer",
      "assistantSkill",
    ];

    const nonResumeCollections = Object.keys(tablesByCollection).filter((id) => id !== "resume");
    expect(nonResumeCollections).toEqual(
      expect.arrayContaining([...resumeChildren, ...userLevelRows]),
    );

    // Iterating the projector's registry also catches collections added later.
    for (const collectionId of nonResumeCollections) {
      for (const type of ["insert", "update", "delete"]) {
        expect(isChargeableResumeInsert(collectionId, type)).toBe(false);
      }
    }
  });
});

describe("chargeProjectedResume", () => {
  it("does nothing while enforcement is off", async () => {
    const { userId } = await signUp("charge-disabled@example.com", "Disabled");

    await chargeProjectedResume({
      userId,
      resumeId: "res-disabled",
      createdAt: new Date(),
      policy: { enabled: false, startAt: undefined },
    });

    expect(await ledgerFor(userId)).toHaveLength(0);
  });

  it("charges once per resume; a rebuild replay does not double-charge", async () => {
    const { userId } = await signUp("charge-replay@example.com", "Replay");

    await chargeProjectedResume({
      userId,
      resumeId: "res-replay",
      createdAt: new Date(),
      policy: ENABLED,
    });
    await chargeProjectedResume({
      userId,
      resumeId: "res-replay",
      createdAt: new Date(),
      policy: ENABLED,
    });

    const rows = await ledgerFor(userId);
    expect(rows.filter((row) => row.type === "resume_spend")).toHaveLength(1);
    const [wallet] = await db
      .select()
      .from(creditWallet)
      .where(eq(creditWallet.userId, userId))
      .limit(1);
    expect(wallet!.monthlyBalance).toBe(19);
  });

  it("grandfathers resumes created before CREDITS_START_AT without spending", async () => {
    const { userId } = await signUp("charge-grandfather@example.com", "Grandfather");
    const startAt = "2026-11-16T00:00:00.000Z";

    await chargeProjectedResume({
      userId,
      resumeId: "res-legacy",
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      policy: { enabled: true, startAt },
    });

    const rows = await ledgerFor(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.type).toBe("resume_spend");
    expect(rows[0]!.amount).toBe(0);
    expect(rows[0]!.reason).toBe("legacy-import");
    expect(rows[0]!.resumeId).toBe("res-legacy");
  });

  it("records an overdraft instead of dropping a resume at zero credits", async () => {
    const { userId } = await signUp("charge-overdraft@example.com", "Overdraft");
    await db.update(user).set({ banned: true }).where(eq(user.id, userId));
    await ensureMonthlyAllocation({ userId, now: FEB_2026 });

    await chargeProjectedResume({
      userId,
      resumeId: "res-overdraft",
      createdAt: new Date(),
      policy: ENABLED,
    });
    // A deferred retry or rebuild must not add a second overdraft row.
    await chargeProjectedResume({
      userId,
      resumeId: "res-overdraft",
      createdAt: new Date(),
      policy: ENABLED,
    });

    const rows = await ledgerFor(userId);
    const overdrafts = rows.filter((row) => row.type === "resume_overdraft");
    expect(overdrafts).toHaveLength(1);
    expect(overdrafts[0]!.amount).toBe(0);
    expect(overdrafts[0]!.idempotencyKey).toBe("resume:res-overdraft");
    expect(rows.some((row) => row.type === "resume_spend")).toBe(false);
  });
});
