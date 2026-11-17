import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { creditLedger } from "@repo/db/schema/credits-schema";
import { resume, resumeExperience } from "@repo/db/schema/resume";
import { syncEvent } from "@repo/db/schema/sync-schema";
import { db } from "../../../db/client";
import { cleanupTouchedUsers, signUp } from "../../../routes/credits/test-helpers";
import { projectUnappliedSyncEvents } from "./project-legacy.server";
import realEvents from "./test-fixtures/real-update-delete-events.json";
import { toSyncEvent, type FixtureEvent } from "./test-fixtures/to-sync-event";

afterAll(cleanupTouchedUsers);

const stream = realEvents as {
  resumeId: string;
  experienceId: string;
  unrelatedDeleteKey: string;
  events: FixtureEvent[];
};

describe("projection of real update and delete events", () => {
  it("projects recorded résumé/children updates for free and never charges a delete", async () => {
    const { userId } = await signUp("projection-real-events@example.com", "RealEvents");

    // Phase 1: real résumé insert, real child update (with real `previous`),
    // and a real résumé update. The child update has no prior insert in this
    // stream, which also exercises the update-with-missing-row upsert path.
    const writes = stream.events.slice(0, 3);
    await db.insert(syncEvent).values(writes.map((event) => toSyncEvent(event, userId)));
    const first = await projectUnappliedSyncEvents(writes.length);
    expect(first.failed).toBe(0);
    expect(first.projected).toBe(writes.length);

    const [projectedResume] = await db.select().from(resume).where(eq(resume.id, stream.resumeId));
    expect(projectedResume).toBeDefined();
    expect(projectedResume!.name).toBe("sample");
    expect(projectedResume!.userId).toBe(userId); // re-owned, not the backup's user id

    const [experience] = await db
      .select()
      .from(resumeExperience)
      .where(eq(resumeExperience.id, stream.experienceId));
    expect(experience).toBeDefined();
    expect(experience!.role).toBe("sample"); // the recorded update payload

    const afterWrite = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId));
    const spends = afterWrite.filter((row) => row.type === "resume_spend");
    expect(spends).toHaveLength(1);
    expect(spends[0]).toMatchObject({
      resumeId: stream.resumeId,
      amount: 0,
      reason: "legacy-import",
    });
    expect(afterWrite.filter((row) => row.type !== "resume_spend")).toHaveLength(0);

    // Phase 2: the recorded delete for an unknown résumé, and the same real
    // delete retargeted at the résumé we just projected.
    const deletes = stream.events.slice(3);
    await db.insert(syncEvent).values(deletes.map((event) => toSyncEvent(event, userId)));
    const second = await projectUnappliedSyncEvents(deletes.length);
    expect(second.failed).toBe(0);
    expect(second.projected).toBe(deletes.length);

    expect(await db.select().from(resume).where(eq(resume.id, stream.resumeId))).toHaveLength(0);
    // The projector deletes only the target row; child rows are not cascaded here.
    expect(
      await db
        .select()
        .from(resumeExperience)
        .where(eq(resumeExperience.id, stream.experienceId)),
    ).toHaveLength(1);

    const afterDelete = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId));
    expect(afterDelete.filter((row) => row.type === "resume_spend")).toHaveLength(1);
    expect(afterDelete.filter((row) => row.type === "resume_overdraft")).toHaveLength(0);
  });
});
