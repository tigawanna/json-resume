import { jobListLabel } from "@/data-access-layer/event-sourced/rows/job-rows";
import type { DashboardToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  startFirstResumeToolInputSchema,
  type StartFirstResumeToolInput,
  type StartFirstResumeToolOutput,
} from "@/features/agentic-tools/first-resume-tool-schemas";
import { createStarterResumeDocument } from "@/features/resume/starter-resume";
import { createLocalResume } from "./local-resume-lifecycle-tools";
import { requireJob } from "./local-job-tools";

/** Creates a starter or imported résumé(s) and hands the last one to the editor. */
export async function startLocalFirstResume(
  ctx: DashboardToolContext,
  input: StartFirstResumeToolInput,
): Promise<StartFirstResumeToolOutput> {
  const data = startFirstResumeToolInputSchema.parse(input);
  const job = data.jobId ? requireJob(ctx.db, data.jobId) : null;
  const supplied =
    data.documents ?? (data.document ? [{ name: data.name, document: data.document }] : []);
  const items =
    supplied.length > 0 ? supplied : [{ name: data.name, document: createStarterResumeDocument() }];

  let created = { resumeId: "", name: data.name };
  for (const item of items) {
    created = await createLocalResume(ctx, {
      name: item.name,
      document: item.document,
      jobId: data.jobId,
      makeActive: true,
    });
  }

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
    imported: supplied.length > 0,
    createdCount: items.length,
    opensAfterReply: true,
  };
}
