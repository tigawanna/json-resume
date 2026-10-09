import { TEMPLATE_IDS, type TemplateId } from "@/features/resume/resume-schema";
import { emptyResumeLayout, type ResumeLayout } from "@/features/resume/resume-layout";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import type {
  Resume,
  ResumeCertification,
  ResumeContact,
  ResumeEducation,
  ResumeEducationBullet,
  ResumeExperience,
  ResumeExperienceBullet,
  ResumeLanguage,
  ResumeLink,
  ResumeNote,
  ResumeProject,
  ResumeSkill,
  ResumeSkillGroup,
  ResumeSummary,
  ResumeTalk,
  ResumeVolunteer,
  Job,
} from "./schemas";
import { legacyJobDescription, linkedJob } from "./job-rows";

/** The résumé row plus the library rows its layout can point at. */
export type EventSourcedResumeSnapshots = {
  resume: Resume | undefined;
  contacts: ResumeContact[];
  links: ResumeLink[];
  summaries: ResumeSummary[];
  notes: ResumeNote[];
  experiences: ResumeExperience[];
  experienceBullets: ResumeExperienceBullet[];
  education: ResumeEducation[];
  educationBullets: ResumeEducationBullet[];
  projects: ResumeProject[];
  skillGroups: ResumeSkillGroup[];
  skills: ResumeSkill[];
  talks: ResumeTalk[];
  certifications: ResumeCertification[];
  volunteers: ResumeVolunteer[];
  languages: ResumeLanguage[];
  jobs: Job[];
};

export function asTemplateId(value: string): TemplateId {
  return TEMPLATE_IDS.includes(value as TemplateId) ? (value as TemplateId) : "classic";
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}

function byId<T extends { id: string }>(rows: ReadonlyArray<T>) {
  return new Map(rows.map((row) => [row.id, row]));
}

/** A résumé saved before layouts existed and never migrated shows the default sections only. */
export function resumeLayoutOf(resume: Pick<Resume, "layout"> | undefined): ResumeLayout {
  return resume?.layout ?? emptyResumeLayout();
}

/** Rows for `ids` in that order; ids with no row (deleted library rows) are skipped. */
function pick<T extends { id: string }>(ids: ReadonlyArray<string>, rows: Map<string, T>) {
  return ids.flatMap((id) => {
    const row = rows.get(id);
    return row ? [row] : [];
  });
}

export function assembleResumeDetail(
  resumeId: string,
  snapshots: EventSourcedResumeSnapshots,
): ResumeDetailDTO | null {
  const resume = snapshots.resume;
  if (!resume || resume.id !== resumeId) return null;

  const layout = resumeLayoutOf(resume);
  const bullets = byId(snapshots.experienceBullets);
  const skills = byId(snapshots.skills);
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
    contacts: pick(layout.contacts, byId(snapshots.contacts)).map((row, sortOrder) => ({
      id: row.id,
      resumeId,
      type: row.type,
      value: row.value,
      label: row.label,
      sortOrder,
    })),
    links: pick(layout.links, byId(snapshots.links)).map((row, sortOrder) => ({
      id: row.id,
      resumeId,
      label: row.label,
      url: row.url,
      icon: row.icon ?? null,
      sortOrder,
    })),
    summaries: pick(layout.summaries, byId(snapshots.summaries)).map((row, sortOrder) => ({
      id: row.id,
      resumeId,
      text: row.text,
      sortOrder,
    })),
    notes: pick(layout.notes, byId(snapshots.notes)).map((row, sortOrder) => ({
      id: row.id,
      resumeId,
      label: row.label,
      text: row.text,
      sortOrder,
    })),
    experiences: pick(
      layout.experiences.map((entry) => entry.id),
      byId(snapshots.experiences),
    ).map((row, sortOrder) => ({
      id: row.id,
      resumeId,
      company: row.company,
      role: row.role,
      startDate: row.startDate,
      endDate: row.endDate,
      location: row.location,
      sortOrder,
      bullets: pick(
        layout.experiences.find((entry) => entry.id === row.id)?.bullets ?? [],
        bullets,
      ).map((bullet, bulletOrder) => ({
        id: bullet.id,
        experienceId: bullet.experienceId,
        text: bullet.text,
        sortOrder: bulletOrder,
      })),
    })),
    education: pick(layout.education, byId(snapshots.education)).map((row, sortOrder) => ({
      id: row.id,
      resumeId,
      school: row.school,
      degree: row.degree,
      field: row.field,
      startDate: row.startDate,
      endDate: row.endDate,
      description: row.description,
      sortOrder,
      bullets: snapshots.educationBullets
        .filter((bullet) => bullet.educationId === row.id)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((bullet) => ({
          id: bullet.id,
          educationId: bullet.educationId,
          text: bullet.text,
          sortOrder: bullet.sortOrder,
        })),
    })),
    projects: pick(layout.projects, byId(snapshots.projects)).map((row, sortOrder) => ({
      id: row.id,
      resumeId,
      name: row.name,
      url: row.url,
      homepageUrl: row.homepageUrl,
      description: row.description,
      tech: row.tech,
      sortOrder,
    })),
    skillGroups: pick(
      layout.skillGroups.map((entry) => entry.id),
      byId(snapshots.skillGroups),
    ).map((row, sortOrder) => ({
      id: row.id,
      resumeId,
      name: row.name,
      sortOrder,
      skills: pick(
        layout.skillGroups.find((entry) => entry.id === row.id)?.skills ?? [],
        skills,
      ).map((skill, skillOrder) => ({
        id: skill.id,
        groupId: row.id,
        name: skill.name,
        level: skill.level ?? null,
        sortOrder: skillOrder,
      })),
    })),
    talks: pick(layout.talks, byId(snapshots.talks)).map((row, sortOrder) => ({
      id: row.id,
      resumeId,
      title: row.title,
      event: row.event,
      date: row.date,
      description: row.description,
      links: row.links,
      sortOrder,
    })),
    certifications: pick(layout.certifications, byId(snapshots.certifications)).map(
      (row, sortOrder) => ({
        id: row.id,
        resumeId,
        name: row.name,
        issuer: row.issuer,
        date: row.date,
        url: row.url,
        sortOrder,
      }),
    ),
    volunteers: pick(layout.volunteers, byId(snapshots.volunteers)).map((row, sortOrder) => ({
      id: row.id,
      resumeId,
      organization: row.organization,
      role: row.role,
      startDate: row.startDate,
      endDate: row.endDate,
      description: row.description,
      sortOrder,
    })),
    languages: pick(layout.languages, byId(snapshots.languages)).map((row, sortOrder) => ({
      id: row.id,
      resumeId,
      name: row.name,
      proficiency: row.proficiency,
      sortOrder,
    })),
  };
}
