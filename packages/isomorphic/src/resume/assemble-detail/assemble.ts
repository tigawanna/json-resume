import { assembleExperiences, assembleEducation, assembleSkillGroups } from "./relations.ts";
import { assembleFlatRows } from "./flat-rows.ts";
import { resumeLayoutOf } from "./helpers.ts";
import { linkedJob, legacyJobDescription } from "./jobs.ts";
import { asTemplateId } from "./template.ts";
import type { EventSourcedResumeSnapshots } from "./types.ts";

function iso(ms: number) {
  return new Date(ms).toISOString();
}

/** Assemble a full résumé detail DTO from already owner-scoped row snapshots. */
export function assembleResumeDetail(resumeId: string, snapshots: EventSourcedResumeSnapshots) {
  const resume = snapshots.resume;
  if (!resume || resume.id !== resumeId) return null;

  const layout = resumeLayoutOf(resume);
  const job = linkedJob(resume, snapshots.jobs);

  return {
    id: resume.id,
    userId: resume.userId,
    name: resume.name,
    fullName: resume.fullName,
    headline: resume.headline,
    description: resume.description,
    jobDescription: job?.description ?? legacyJobDescription(resume),
    jobId: job?.id ?? null,
    job: job
      ? {
          id: job.id,
          company: job.company,
          title: job.title,
          description: job.description,
          url: job.url,
          location: job.location,
          payRate: job.payRate,
          status: job.status,
        }
      : null,
    templateId: asTemplateId(resume.templateId),
    createdAt: iso(resume.createdAt),
    updatedAt: iso(resume.updatedAt),
    sections: layout.sections.map((section, sortOrder) => ({
      id: `${resumeId}:${section.key}`,
      resumeId,
      key: section.key,
      title: section.title,
      enabled: section.enabled,
      sortOrder,
    })),
    ...assembleFlatRows({ resumeId, layout, snapshots }),
    experiences: assembleExperiences({ resumeId, layout, snapshots }),
    education: assembleEducation({ resumeId, layout, snapshots }),
    skillGroups: assembleSkillGroups({ resumeId, layout, snapshots }),
  };
}
