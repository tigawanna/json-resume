import { jobDescriptionPreview } from "@/data-access-layer/event-sourced/job-rows";
import { jobStatusToolSchema, type JobDetail, type JobRow } from "../resume-tool-schemas";

/** The job columns both the local collection and the Drizzle table have. */
export interface JobViewSource {
  id: string;
  company: string;
  title: string;
  location: string;
  status: string;
  url: string;
  notes: string;
  description: string;
  updatedAt: number | Date;
}

function jobStatus(status: string) {
  const parsed = jobStatusToolSchema.safeParse(status);
  return parsed.success ? parsed.data : "saved";
}

/** Résumé ids per job id, from `(resumeId, jobId)` pairs. */
export function linkedResumesByJob(
  links: ReadonlyArray<{ id: string; jobId: string | null | undefined }>,
): Map<string, string[]> {
  const byJob = new Map<string, string[]>();
  for (const link of links) {
    if (!link.jobId) continue;
    byJob.set(link.jobId, [...(byJob.get(link.jobId) ?? []), link.id]);
  }
  return byJob;
}

function jobFields(job: JobViewSource, linkedResumeIds: string[]) {
  return {
    id: job.id,
    company: job.company,
    title: job.title,
    location: job.location,
    status: jobStatus(job.status),
    url: job.url,
    notes: job.notes,
    linkedResumeIds,
    updatedAt: new Date(job.updatedAt).toISOString(),
  };
}

/** `list_jobs` / `save_job` row, shared by the local and remote implementations. */
export function jobRowView(job: JobViewSource, linkedResumeIds: string[]): JobRow {
  return {
    ...jobFields(job, linkedResumeIds),
    descriptionPreview: jobDescriptionPreview(job.description),
  };
}

/** `get_job` output: the row plus the full posting text. */
export function jobDetailView(job: JobViewSource, linkedResumeIds: string[]): JobDetail {
  return { ...jobFields(job, linkedResumeIds), description: job.description };
}
