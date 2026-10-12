// @vitest-environment node
import { describe, expect, it } from "vitest";
import type {
  DashboardToolContext,
  ResumeHandoff,
} from "@/features/agentic-tools/definitions/tool-context";
import { useLocalToolDb } from "./local-tool-fixtures";
import { startLocalResumeForJob } from "./local-start-resume-tool";

const fixture = useLocalToolDb();
const { insertJob, insertResume } = fixture;

function dashboardContext(): DashboardToolContext & { handoffs: ResumeHandoff[] } {
  const handoffs: ResumeHandoff[] = [];
  return {
    ...fixture.context(null),
    handoffs,
    handOff: (handoff) => {
      handoffs.push(handoff);
    },
  };
}

const proposal = {
  jobId: "go",
  reason: "It already covers Go and billing.",
  suggestedPrompt: "Tailor the summary to billing.",
};

function seed() {
  insertJob("go", { company: "Acme", title: "Go Engineer", description: "Build Go services." });
  insertJob("old", { company: "Initech", title: "SRE", description: "Keep things up." });
  insertResume("cv", 1, { name: "CV" });
  insertResume("sre", 2, { name: "SRE CV", jobId: "old" });
}

describe("start_resume_for_job", () => {
  it("copies the base résumé, points the copy at the job and hands it off", () => {
    seed();
    const ctx = dashboardContext();

    const result = startLocalResumeForJob(ctx, { ...proposal, resumeId: "cv", mode: "copy" });

    expect(result).toMatchObject({
      mode: "copy",
      baseResumeId: "cv",
      jobId: "go",
      jobAttached: true,
      name: "CV for Acme — Go Engineer",
    });
    expect(result.resumeId).not.toBe("cv");
    expect(fixture.db().collections.resume.get(result.resumeId)?.jobId).toBe("go");
    expect(fixture.db().collections.resume.get("cv")?.jobId).toBeNull();
    expect(ctx.handoffs).toEqual([
      expect.objectContaining({
        resumeId: result.resumeId,
        mode: "copy",
        baseResumeName: "CV",
        suggestedPrompt: proposal.suggestedPrompt,
      }),
    ]);
  });

  it("reuses a résumé with no target job and attaches the job to it", () => {
    seed();
    const ctx = dashboardContext();

    const result = startLocalResumeForJob(ctx, { ...proposal, resumeId: "cv", mode: "reuse" });

    expect(result).toMatchObject({ resumeId: "cv", mode: "reuse", jobAttached: true });
    expect(fixture.db().collections.resume.get("cv")?.jobId).toBe("go");
    expect(ctx.handoffs[0]?.resumeId).toBe("cv");
  });

  it("leaves a reused résumé pointing at its other job", () => {
    seed();
    const ctx = dashboardContext();

    const result = startLocalResumeForJob(ctx, { ...proposal, resumeId: "sre", mode: "reuse" });

    expect(result).toMatchObject({ resumeId: "sre", jobAttached: false });
    expect(fixture.db().collections.resume.get("sre")?.jobId).toBe("old");
  });

  it("rejects an unknown résumé without handing off", () => {
    seed();
    const ctx = dashboardContext();

    expect(() =>
      startLocalResumeForJob(ctx, { ...proposal, resumeId: "missing", mode: "copy" }),
    ).toThrow(/was not found/);
    expect(ctx.handoffs).toEqual([]);
  });
});
