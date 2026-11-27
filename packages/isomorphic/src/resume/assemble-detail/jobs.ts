import { z } from "zod";
import type { JobSnapshot, ResumeSnapshot } from "./types.ts";

const legacyJobDescriptionSchema = z.object({ jobDescription: z.string() });

/** Legacy pasted posting text was kept on the résumé row before jobs existed. */
export function legacyJobDescription(resume: object): string {
  const parsed = legacyJobDescriptionSchema.safeParse(resume);
  return parsed.success ? parsed.data.jobDescription.trim() : "";
}

export function linkedJob(
  resume: Pick<ResumeSnapshot, "jobId">,
  jobs: ReadonlyArray<JobSnapshot>,
): JobSnapshot | null {
  if (!resume.jobId) return null;
  return jobs.find((row) => row.id === resume.jobId) ?? null;
}
