import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { creditLedger } from "@repo/db/schema/credits-schema";
import realEventsFixture from "./test-fixtures/resume-projection-events.json";
import { toSyncEvent } from "./test-fixtures/to-sync-event";
import {
  resume,
  resumeEducation,
  resumeExperience,
  resumeExperienceBullet,
  resumeSummary,
} from "@repo/db/schema/resume";
import { syncEvent } from "@repo/db/schema/sync-schema";
import { cleanupTouchedUsers, signUp } from "../../../routes/credits/test-helpers";
import { projectUnappliedSyncEvents } from "./project-legacy.server";

afterAll(cleanupTouchedUsers);

/**
 * Extracted from the local app DB: three full résumés and every event for the
 * rows their layouts reference (experiences, bullets, skills, education,
 * projects, summaries, contacts, links, talks). Free text is redacted; ids,
 * relationships, event types, and column shapes are untouched.
 */
const fixture = realEventsFixture as {
  resumeIds: string[];
  events: Array<{
    collectionId: string;
    type: "insert" | "update" | "delete";
    key: string;
    payload: Record<string, unknown>;
    clientTimestamp: number;
  }>;
};

describe("projection charges real sync events", () => {
  it("grandfathers the three real résumés, projects their child rows for free, and never double-charges on rebuild", async () => {
    const { userId } = await signUp("projection-charge@example.com", "Projection");

    await db.insert(syncEvent).values(fixture.events.map((event) => toSyncEvent(event, userId)));

    const result = await projectUnappliedSyncEvents(fixture.events.length);
    expect(result.failed).toBe(0);
    expect(result.projected).toBe(fixture.events.length);

    const spends = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId))
      .then((rows) => rows.filter((row) => row.type === "resume_spend"));
    expect(spends).toHaveLength(3);
    expect(spends.map((row) => row.resumeId).sort((a, b) => a!.localeCompare(b!))).toEqual(
      [...fixture.resumeIds].sort((a, b) => a.localeCompare(b)),
    );
    expect(
      spends.map((row) => ({ amount: row.amount, bucket: row.bucket, reason: row.reason })),
    ).toEqual(
      fixture.resumeIds.map(() => ({ amount: 0, bucket: "monthly", reason: "legacy-import" })),
    );

    // The real projected graph actually landed (not just the ledger rows).
    expect(await db.select({ id: resume.id }).from(resume)).toHaveLength(3);
    const childCounts = await Promise.all([
      db.select({ id: resumeExperience.id }).from(resumeExperience),
      db.select({ id: resumeExperienceBullet.id }).from(resumeExperienceBullet),
      db.select({ id: resumeEducation.id }).from(resumeEducation),
      db.select({ id: resumeSummary.id }).from(resumeSummary),
    ]);
    const distinctKeys = (collectionId: string) =>
      new Set(
        fixture.events
          .filter((event) => event.collectionId === collectionId && event.type !== "delete")
          .map((event) => event.key),
      ).size;
    expect(childCounts.map((rows) => rows.length)).toEqual([
      distinctKeys("resumeExperience"),
      distinctKeys("resumeExperienceBullet"),
      distinctKeys("resumeEducation"),
      distinctKeys("resumeSummary"),
    ]);

    // A rebuild re-emits inserts for the same three résumés: still three charges.
    await db.insert(syncEvent).values(
      fixture.events
        .filter((event) => event.collectionId === "resume")
        .map((event) => toSyncEvent(event, userId)),
    );
    await projectUnappliedSyncEvents(fixture.events.length);

    const afterRebuild = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId))
      .then((rows) => rows.filter((row) => row.type === "resume_spend"));
    expect(afterRebuild).toHaveLength(3);
  });
});
