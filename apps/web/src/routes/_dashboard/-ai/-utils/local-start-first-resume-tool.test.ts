// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";
import type {
  DashboardToolContext,
  ResumeHandoff,
} from "@/features/agentic-tools/definitions/tool-context";
import { createDefaultResume } from "@/features/resume/resume-schema";
import { useLocalToolDb } from "./local-tool-fixtures";
import { startLocalFirstResume } from "./local-start-first-resume-tool";

const fixture = useLocalToolDb();
const { insertJob } = fixture;

function dashboardContext(): DashboardToolContext & { handoffs: ResumeHandoff[] } {
  const handoffs: ResumeHandoff[] = [];
  return {
    ...fixture.context(null),
    handoffs,
    handOff: (handoff) => {
      handoffs.push(handoff);
    },
    getGroupTitleIds: () => [],
    getActiveConversationId: () => "conversation",
    getToolPack: () => "resume-list",
  };
}

const intake = {
  name: "Alex Chen",
  reason: "Starting from answers: software engineer, 6 years, last role at Initech.",
  suggestedPrompt: "Fill this résumé from the intake. Ask anything still missing.",
};

describe("start_first_resume", () => {
  it("creates a blank résumé and hands it off without a job", async () => {
    const ctx = dashboardContext();

    const result = await startLocalFirstResume(ctx, intake);

    expect(result).toMatchObject({
      name: "Alex Chen",
      jobId: null,
      jobAttached: false,
      imported: false,
      createdCount: 1,
      opensAfterReply: true,
    });
    expect(fixture.db().collections.resume.get(result.resumeId)?.name).toBe("Alex Chen");
    expect(fixture.db().collections.resume.get(result.resumeId)?.fullName).toBe("Your name");
    expect(ctx.handoffs).toEqual([
      expect.objectContaining({
        resumeId: result.resumeId,
        mode: "create",
        suggestedPrompt: intake.suggestedPrompt,
        jobAttached: false,
      }),
    ]);
  });

  it("imports a document, attaches a job, and hands that context off", async () => {
    insertJob("go", { company: "Acme", title: "Go Engineer", description: "Build Go services." });
    const ctx = dashboardContext();
    const document = createDefaultResume();

    const result = await startLocalFirstResume(ctx, {
      ...intake,
      document,
      jobId: "go",
    });

    expect(result).toMatchObject({
      jobId: "go",
      jobAttached: true,
      imported: true,
      createdCount: 1,
    });
    expect(fixture.db().collections.resume.get(result.resumeId)?.jobId).toBe("go");
    expect(ctx.handoffs[0]).toEqual(
      expect.objectContaining({
        mode: "create",
        jobLabel: expect.stringContaining("Acme"),
        jobAttached: true,
      }),
    );
  });

  it("imports several documents and hands off the last", async () => {
    const ctx = dashboardContext();
    const document = createDefaultResume();

    const result = await startLocalFirstResume(ctx, {
      ...intake,
      documents: [
        { name: "One", document },
        { name: "Two", document },
      ],
    });

    expect(result.createdCount).toBe(2);
    expect(result.imported).toBe(true);
    expect(result.name).toBe("Two");
    expect(fixture.db().collections.resume.toArray).toHaveLength(2);
  });
});
