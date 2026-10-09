// @vitest-environment node
import { describe, expect, it } from "vitest";
import { useLocalToolDb } from "./local-tool-fixtures";
import { setLocalSummary, updateLocalResumeDetails } from "./local-resume-edit-tools";
import { createLocalResume } from "./local-resume-lifecycle-tools";
import { getLocalResume } from "./local-resume-tools";
import { trackAiChange, undoLocalAiChange } from "./local-undo-tools";

const fixture = useLocalToolDb();
const { context, insertResume, insertSummary } = fixture;

/** Lets multi-row transactions finish writing their outbox events. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

function seed() {
  insertSummary("s1", "Old summary");
  insertResume("cv", 1, { name: "CV", headline: "Engineer", layout: { summaries: ["s1"] } });
}

const summaryText = (ctx: ReturnType<typeof context>) =>
  getLocalResume(ctx, { sections: ["summary"] }).resume.summary?.map((row) => row.text);

describe("undo_last_ai_change", () => {
  it("reverts the last write tool call", async () => {
    seed();
    const ctx = context("cv");

    await trackAiChange(ctx, "set_summary", () => setLocalSummary(ctx, { text: "New summary" }));
    await settle();
    expect(summaryText(ctx)).toEqual(["New summary"]);

    const result = undoLocalAiChange(ctx, {});

    expect(result).toMatchObject({
      undoneTool: "set_summary",
      skipped: [],
      unknown: [],
      remaining: 0,
      activeResumeId: "cv",
    });
    expect(result.reverted).toBeGreaterThan(0);
    expect(summaryText(ctx)).toEqual(["Old summary"]);
  });

  it("steps back one call at a time", async () => {
    seed();
    const ctx = context("cv");

    await trackAiChange(ctx, "update_resume_details", () =>
      updateLocalResumeDetails(ctx, { headline: "Staff engineer" }),
    );
    await trackAiChange(ctx, "set_summary", () => setLocalSummary(ctx, { text: "New summary" }));
    await settle();

    expect(undoLocalAiChange(ctx, {}).undoneTool).toBe("set_summary");
    expect(fixture.db().collections.resume.get("cv")?.headline).toBe("Staff engineer");
    expect(undoLocalAiChange(ctx, {}).undoneTool).toBe("update_resume_details");
    expect(fixture.db().collections.resume.get("cv")?.headline).toBe("Engineer");
    expect(undoLocalAiChange(ctx, {})).toMatchObject({ undoneTool: null, reverted: 0 });
  });

  it("leaves rows the user edited since alone", async () => {
    seed();
    const ctx = context("cv");

    await trackAiChange(ctx, "update_resume_details", () =>
      updateLocalResumeDetails(ctx, { headline: "Staff engineer" }),
    );
    fixture.db().collections.resume.update("cv", (draft) => {
      draft.headline = "Typed by the user";
    });
    await settle();

    const result = undoLocalAiChange(ctx, {});

    expect(result).toMatchObject({
      undoneTool: "update_resume_details",
      reverted: 0,
      skipped: [{ collectionId: "resume", key: "cv" }],
    });
    expect(fixture.db().collections.resume.get("cv")?.headline).toBe("Typed by the user");
  });

  it("removes a résumé the assistant created and reports the active one is gone", async () => {
    seed();
    const ctx = context("cv");

    const created = await trackAiChange(ctx, "create_resume", () =>
      createLocalResume(ctx, { name: "Blank" }),
    );
    await settle();
    expect(ctx.getActiveResumeId()).toBe(created.resumeId);

    const result = undoLocalAiChange(ctx, {});

    expect(result).toMatchObject({ undoneTool: "create_resume", activeResumeId: null });
    expect(fixture.db().collections.resume.has(created.resumeId)).toBe(false);
  });
});
