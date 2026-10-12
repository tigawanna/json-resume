import { cloneResume } from "@/data-access-layer/event-sourced/clone-resume";
import { attachJobToResume, jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import {
  startResumeForJobToolInputSchema,
  type StartResumeForJobToolInput,
  type StartResumeForJobToolOutput,
} from "@/features/agentic-tools/dashboard-tool-schemas";
import type { DashboardToolContext } from "@/features/agentic-tools/definitions/tool-context";
import { requireJob } from "./local-job-tools";

/** Runs after the user approved: reuse or copy the résumé, point it at the job, then hand off. */
export function startLocalResumeForJob(
  ctx: DashboardToolContext,
  input: StartResumeForJobToolInput,
): StartResumeForJobToolOutput {
  const data = startResumeForJobToolInputSchema.parse(input);
  const job = requireJob(ctx.db, data.jobId);
  const base = ctx.db.collections.resume.get(data.resumeId);
  if (!base) {
    throw new Error(`Resume ${data.resumeId} was not found. Use list_resumes to find its id.`);
  }
  const jobLabel = jobListLabel(job);

  let resumeId = base.id;
  let name = base.name;
  let jobAttached = true;
  if (data.mode === "copy") {
    const copy = cloneResume(ctx.db, base.id, {
      name: data.name ?? `${base.name} for ${jobLabel}`.slice(0, 120),
    });
    resumeId = copy.resumeId;
    name = copy.name;
    attachJobToResume(ctx.db, resumeId, job.id);
  } else if (!base.jobId) {
    attachJobToResume(ctx.db, base.id, job.id);
  } else if (base.jobId !== job.id) {
    jobAttached = false;
  }

  ctx.handOff({
    resumeId,
    name,
    mode: data.mode,
    baseResumeName: base.name,
    jobLabel,
    jobAttached,
    reason: data.reason,
    suggestedPrompt: data.suggestedPrompt,
  });

  return {
    resumeId,
    name,
    mode: data.mode,
    baseResumeId: base.id,
    jobId: job.id,
    jobAttached,
    opensAfterReply: true,
  };
}
