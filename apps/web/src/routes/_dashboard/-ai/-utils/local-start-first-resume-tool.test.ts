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
      opensAfterReply: true,
    });
    expect(fixture.db().collections.resume.get(result.resumeId)?.name).toBe("Alex Chen");
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
});
