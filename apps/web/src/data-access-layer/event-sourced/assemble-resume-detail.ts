import { SECTION_KEYS, TEMPLATE_IDS, type TemplateId } from "@/features/resume/resume-schema";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import type {
  Resume,
  ResumeCertification,
  ResumeCertificationItem,
  ResumeContact,
  ResumeContactItem,
  ResumeEducation,
  ResumeEducationBullet,
  ResumeEducationItem,
  ResumeExperience,
  ResumeExperienceBullet,
  ResumeExperienceBulletItem,
  ResumeExperienceItem,
  ResumeLanguage,
  ResumeLanguageItem,
  ResumeLink,
  ResumeLinkItem,
  ResumeNote,
  ResumeNoteItem,
  ResumeProject,
  ResumeProjectItem,
  ResumeSection,
  ResumeSkill,
  ResumeSkillGroup,
  ResumeSkillGroupItem,
  ResumeSkillGroupSkill,
  ResumeSummary,
  ResumeSummaryItem,
  ResumeTalk,
  ResumeTalkItem,
  ResumeVolunteer,
  ResumeVolunteerItem,
  Job,
} from "./schemas";
import { itemsInResumeOrder } from "./resume-item-order";
import { resolveJobDescription } from "./job-rows";

export type EventSourcedResumeSnapshots = {
  resume: Resume | undefined;
  sections: ResumeSection[];
  contacts: ResumeContact[];
  contactItems: ResumeContactItem[];
  links: ResumeLink[];
  linkItems: ResumeLinkItem[];
  summaries: ResumeSummary[];
  summaryItems: ResumeSummaryItem[];
  notes: ResumeNote[];
  noteItems: ResumeNoteItem[];
  experiences: ResumeExperience[];
  experienceItems: ResumeExperienceItem[];
  experienceBullets: ResumeExperienceBullet[];
  experienceBulletItems: ResumeExperienceBulletItem[];
  education: ResumeEducation[];
  educationItems: ResumeEducationItem[];
  educationBullets: ResumeEducationBullet[];
  projects: ResumeProject[];
  projectItems: ResumeProjectItem[];
  skillGroups: ResumeSkillGroup[];
  skillGroupItems: ResumeSkillGroupItem[];
  skills: ResumeSkill[];
  skillGroupSkills: ResumeSkillGroupSkill[];
  talks: ResumeTalk[];
  talkItems: ResumeTalkItem[];
  certifications: ResumeCertification[];
  certificationItems: ResumeCertificationItem[];
  volunteers: ResumeVolunteer[];
  volunteerItems: ResumeVolunteerItem[];
  languages: ResumeLanguage[];
  languageItems: ResumeLanguageItem[];
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

function joinSorted<TItem extends { resumeId: string; sortOrder: number }, TRow>(
  resumeId: string,
  items: TItem[],
  rowsById: Map<string, TRow>,
  entityId: (item: TItem) => string,
  order?: string[],
) {
  return itemsInResumeOrder(resumeId, items, order, entityId).flatMap((item, index) => {
    const row = rowsById.get(entityId(item));
    if (!row) return [];
    return [{ item, row, sortOrder: index }];
  });
}

/**
 * The résumé's linked bullets for one experience. An experience none of whose
 * bullets are linked anywhere predates bullet links, so all of them show.
 */
export function bulletsForResume<
  B extends Pick<ResumeExperienceBullet, "id" | "experienceId" | "sortOrder">,
>(
  resumeId: string,
  experienceId: string,
  bullets: ReadonlyArray<B>,
  bulletItems: ReadonlyArray<
    Pick<ResumeExperienceBulletItem, "resumeId" | "bulletId" | "sortOrder">
  >,
): B[] {
  const own = bullets.filter((bullet) => bullet.experienceId === experienceId);
  const ownIds = new Set(own.map((bullet) => bullet.id));
  const links = bulletItems.filter((item) => ownIds.has(item.bulletId));
  if (links.length === 0) return own.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const rows = byId(own);
  return links
    .filter((item) => item.resumeId === resumeId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((item) => {
      const row = rows.get(item.bulletId);
      return row ? [{ ...row, sortOrder: item.sortOrder }] : [];
    });
}

/** A group's skills in link order; groups without links still use legacy `groupId`. */
export function skillsForGroup<S extends Pick<ResumeSkill, "id" | "groupId" | "sortOrder">>(
  groupId: string,
  skills: ReadonlyArray<S>,
  groupSkills: ReadonlyArray<Pick<ResumeSkillGroupSkill, "groupId" | "skillId" | "sortOrder">>,
): S[] {
  const links = groupSkills.filter((link) => link.groupId === groupId);
  if (links.length === 0) {
    return skills
      .filter((skill) => skill.groupId === groupId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const rows = byId(skills);
  return links
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((link) => {
      const row = rows.get(link.skillId);
      return row ? [{ ...row, sortOrder: link.sortOrder }] : [];
    });
}

export function assembleResumeDetail(
  resumeId: string,
  snapshots: EventSourcedResumeSnapshots,
): ResumeDetailDTO | null {
  const resume = snapshots.resume;
  if (!resume || resume.id !== resumeId) return null;

  const sectionRows = snapshots.sections
    .filter((section) => section.resumeId === resumeId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const sections =
    sectionRows.length > 0
      ? sectionRows.map((section) => ({
          id: section.id,
          resumeId: section.resumeId,
          key: section.key,
          title: section.title,
          enabled: section.enabled,
          sortOrder: section.sortOrder,
        }))
      : SECTION_KEYS.map((key, sortOrder) => ({
          id: `${resumeId}:${key}`,
          resumeId,
          key,
          title: key === "header" ? "Profile" : key.charAt(0).toUpperCase() + key.slice(1),
          enabled: true,
          sortOrder,
        }));

  const contacts = joinSorted(
    resumeId,
    snapshots.contactItems,
    byId(snapshots.contacts),
    (item) => item.contactId,
  ).map(({ row, sortOrder }) => ({
    id: row.id,
    resumeId,
    type: row.type,
    value: row.value,
    label: row.label,
    sortOrder,
  }));

  const links = joinSorted(
    resumeId,
    snapshots.linkItems,
    byId(snapshots.links),
    (item) => item.linkId,
  ).map(({ row, sortOrder }) => ({
    id: row.id,
    resumeId,
    label: row.label,
    url: row.url,
    icon: row.icon ?? null,
    sortOrder,
  }));

  const summaries = joinSorted(
    resumeId,
    snapshots.summaryItems,
    byId(snapshots.summaries),
    (item) => item.summaryId,
  ).map(({ row, sortOrder }) => ({
    id: row.id,
    resumeId,
    text: row.text,
    sortOrder,
  }));

  const notes = joinSorted(
    resumeId,
    snapshots.noteItems,
    byId(snapshots.notes),
    (item) => item.noteId,
  ).map(({ row, sortOrder }) => ({
    id: row.id,
    resumeId,
    label: row.label,
    text: row.text,
    sortOrder,
  }));

  const experiences = joinSorted(
    resumeId,
    snapshots.experienceItems,
    byId(snapshots.experiences),
    (item) => item.experienceId,
    resume.experienceOrder,
  ).map(({ row, sortOrder }) => ({
    id: row.id,
    resumeId,
    company: row.company,
    role: row.role,
    startDate: row.startDate,
    endDate: row.endDate,
    location: row.location,
    sortOrder,
    bullets: bulletsForResume(
      resumeId,
      row.id,
      snapshots.experienceBullets,
      snapshots.experienceBulletItems,
    ).map((bullet) => ({
      id: bullet.id,
      experienceId: bullet.experienceId,
      text: bullet.text,
      sortOrder: bullet.sortOrder,
    })),
  }));

  const education = joinSorted(
    resumeId,
    snapshots.educationItems,
    byId(snapshots.education),
    (item) => item.educationId,
    resume.educationOrder,
  ).map(({ row, sortOrder }) => ({
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
  }));

  const projects = joinSorted(
    resumeId,
    snapshots.projectItems,
    byId(snapshots.projects),
    (item) => item.projectId,
    resume.projectOrder,
  ).map(({ row, sortOrder }) => ({
    id: row.id,
    resumeId,
    name: row.name,
    url: row.url,
    homepageUrl: row.homepageUrl,
    description: row.description,
    tech: row.tech,
    sortOrder,
  }));

  const skillGroups = joinSorted(
    resumeId,
    snapshots.skillGroupItems,
    byId(snapshots.skillGroups),
    (item) => item.groupId,
  ).map(({ row, sortOrder }) => ({
    id: row.id,
    resumeId,
    name: row.name,
    sortOrder,
    skills: skillsForGroup(row.id, snapshots.skills, snapshots.skillGroupSkills).map((skill) => ({
      id: skill.id,
      groupId: row.id,
      name: skill.name,
      level: skill.level ?? null,
      sortOrder: skill.sortOrder,
    })),
  }));

  const talks = joinSorted(
    resumeId,
    snapshots.talkItems,
    byId(snapshots.talks),
    (item) => item.talkId,
    resume.talkOrder,
  ).map(({ row, sortOrder }) => ({
    id: row.id,
    resumeId,
    title: row.title,
    event: row.event,
    date: row.date,
    description: row.description,
    links: row.links,
    sortOrder,
  }));

  const certifications = joinSorted(
    resumeId,
    snapshots.certificationItems,
    byId(snapshots.certifications),
    (item) => item.certificationId,
  ).map(({ row, sortOrder }) => ({
    id: row.id,
    resumeId,
    name: row.name,
    issuer: row.issuer,
    date: row.date,
    url: row.url,
    sortOrder,
  }));

  const volunteers = joinSorted(
    resumeId,
    snapshots.volunteerItems,
    byId(snapshots.volunteers),
    (item) => item.volunteerId,
  ).map(({ row, sortOrder }) => ({
    id: row.id,
    resumeId,
    organization: row.organization,
    role: row.role,
    startDate: row.startDate,
    endDate: row.endDate,
    description: row.description,
    sortOrder,
  }));

  const languages = joinSorted(
    resumeId,
    snapshots.languageItems,
    byId(snapshots.languages),
    (item) => item.languageId,
  ).map(({ row, sortOrder }) => ({
    id: row.id,
    resumeId,
    name: row.name,
    proficiency: row.proficiency,
    sortOrder,
  }));

  return {
    id: resume.id,
    userId: resume.userId,
    name: resume.name,
    fullName: resume.fullName,
    headline: resume.headline,
    description: resume.description,
    jobDescription: resolveJobDescription(resume, snapshots.jobs),
    jobId: resume.jobId ?? null,
    templateId: asTemplateId(resume.templateId),
    createdAt: iso(resume.createdAt),
    updatedAt: iso(resume.updatedAt),
    sections,
    contacts,
    links,
    summaries,
    notes,
    experiences,
    education,
    projects,
    skillGroups,
    talks,
    certifications,
    volunteers,
    languages,
  };
}
