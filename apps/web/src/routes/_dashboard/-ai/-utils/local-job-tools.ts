import {
  attachJobToResume,
  insertJob,
  jobListLabel,
  updateJob,
} from "@/data-access-layer/event-sourced/job-rows";
import type { Job } from "@/data-access-layer/event-sourced/schemas";
import type {
  AttachJobToCurrentResumeToolOutput,
  ListJobsToolOutput,
  SaveJobToolOutput,
} from "@/features/agentic-tools/resume-tool-schemas";
import type { EventSourcedResumeAiContext } from "./local-resume-tools";

function preview(text: string, max = 240) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function toJobToolRow(ctx: EventSourcedResumeAiContext, job: Job) {
  const resume = ctx.db.collections.resume.toArray.find((row) => row.id === ctx.resumeId);
  return {
    id: job.id,
    company: job.company,
    title: job.title,
    location: job.location,
    status: job.status,
    url: job.url,
    descriptionPreview: preview(job.description),
    attachedToCurrentResume: resume?.jobId === job.id,
  };
}

export function saveLocalJob(
  ctx: EventSourcedResumeAiContext,
  input: {
    description: string;
    company?: string;
    title?: string;
    url?: string;
    location?: string;
    status?: Job["status"];
    notes?: string;
    attachToCurrentResume?: boolean;
  },
): SaveJobToolOutput {
  const company = input.company?.trim() ?? "";

  const existing = ctx.db.collections.job.toArray.find((row) => {
    if (row.description.trim() === input.description.trim()) return true;
    if (!company) return false;
    const sameCompany = row.company.trim().toLowerCase() === company.toLowerCase();
    if (!sameCompany) return false;
    const incomingTitle = input.title?.trim().toLowerCase() ?? "";
    const existingTitle = row.title.trim().toLowerCase();
    return Boolean(incomingTitle && existingTitle) && incomingTitle === existingTitle;
  });

  const job = existing
    ? updateJob(ctx.db, existing.id, {
        company: company || existing.company,
        description: input.description,
        title: input.title ?? existing.title,
        url: input.url ?? existing.url,
        location: input.location ?? existing.location,
        status: input.status ?? existing.status,
        notes: input.notes ?? existing.notes,
      })
    : insertJob(ctx.db, ctx.userId, {
        company,
        description: input.description,
        title: input.title,
        url: input.url,
        location: input.location,
        status: input.status,
        notes: input.notes,
      });

  const attach = input.attachToCurrentResume !== false;
  if (attach) {
    attachJobToResume(ctx.db, ctx.resumeId, job.id);
  }

  return {
    job: toJobToolRow(ctx, job),
    created: !existing,
    attachedToCurrentResume: attach,
  };
}

export function listLocalJobs(
  ctx: EventSourcedResumeAiContext,
  input: { keyword?: string; status?: Job["status"]; limit?: number },
): ListJobsToolOutput {
  const needle = input.keyword?.trim().toLowerCase();
  const limit = input.limit ?? 20;
  const jobs = ctx.db.collections.job.toArray
    .filter((job) => {
      if (input.status && job.status !== input.status) return false;
      if (!needle) return true;
      return [job.company, job.title, job.location, job.description, job.notes, job.searchableText]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit)
    .map((job) => toJobToolRow(ctx, job));
  return { jobs };
}

export function attachLocalJobToCurrentResume(
  ctx: EventSourcedResumeAiContext,
  jobId: string,
): AttachJobToCurrentResumeToolOutput {
  attachJobToResume(ctx.db, ctx.resumeId, jobId);
  const job = ctx.db.collections.job.toArray.find((row) => row.id === jobId);
  if (!job) {
    throw new Error(`Job ${jobId} was not found.`);
  }
  return {
    resumeId: ctx.resumeId,
    jobId: job.id,
    company: job.company,
    title: jobListLabel(job),
  };
}
