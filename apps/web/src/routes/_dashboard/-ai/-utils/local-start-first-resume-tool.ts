import {
  startFirstResumeToolInputSchema,
  type StartFirstResumeToolInput,
  type StartFirstResumeToolOutput,
} from "@/features/agentic-tools/first-resume-tool-schemas";
import type { DashboardToolContext } from "@/features/agentic-tools/definitions/tool-context";
import { jobListLabel } from "@/data-access-layer/event-sourced/rows/job-rows";
import { createLocalResume } from "./local-resume-lifecycle-tools";
import { requireJob } from "./local-job-tools";

/** Creates a shell (blank or imported) and hands it to the résumé editor. */
export async function startLocalFirstResume(
  ctx: DashboardToolContext,
  input: StartFirstResumeToolInput,
): Promise<StartFirstResumeToolOutput> {
  const data = startFirstResumeToolInputSchema.parse(input);
  const job = data.jobId ? requireJob(ctx.db, data.jobId) : null;
  const created = await createLocalResume(ctx, {
    name: data.name,
    document: data.document,
    jobId: data.jobId,
    makeActive: true,
  });

  ctx.handOff({
    resumeId: created.resumeId,
    name: created.name,
    mode: "create",
    baseResumeName: "",
    jobLabel: job ? jobListLabel(job) : "",
    jobAttached: Boolean(job),
    reason: data.reason,
    suggestedPrompt: data.suggestedPrompt,
  });

  return {
    resumeId: created.resumeId,
    name: created.name,
    jobId: job?.id ?? null,
    jobAttached: Boolean(job),
    imported: Boolean(data.document),
    opensAfterReply: true,
  };
}
