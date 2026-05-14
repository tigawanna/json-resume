import { documentToInsertData } from "@/data-access-layer/resume/resume-converters";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import type { ResumeDocumentV1 } from "@/features/resume/resume-schema";

export const LOCAL_ANONYMOUS_USER_ID = "local:anonymous";

export function nowIso() {
  return new Date().toISOString();
}

export function resumeDocumentToDetail({
  id,
  userId,
  name,
  description,
  jobDescription,
  createdAt,
  doc,
}: {
  id: string;
  userId: string;
  name: string;
  description: string;
  jobDescription: string;
  createdAt: string;
  doc: ResumeDocumentV1;
}): ResumeDetailDTO {
  const data = documentToInsertData(id, userId, doc);
  const updatedAt = nowIso();

  return {
    id,
    userId,
    name,
    fullName: data.resume.fullName,
    headline: data.resume.headline,
    description,
    jobDescription,
    templateId: data.resume.templateId,
    createdAt,
    updatedAt,
    sections: data.sections,
    contacts: data.contacts.map(({ userId: _userId, ...contact }) => ({
      ...contact,
      resumeId: id,
    })),
    links: data.links.map(({ userId: _userId, ...link }) => ({ ...link, resumeId: id })),
    summaries: data.summaries.map(({ userId: _userId, ...summary }) => ({
      ...summary,
      resumeId: id,
    })),
    experiences: data.experiences.map(({ userId: _userId, ...experience }) => ({
      ...experience,
      resumeId: id,
      bullets: data.experienceBullets.filter((bullet) => bullet.experienceId === experience.id),
    })),
    education: data.education.map(({ userId: _userId, ...education }) => ({
      ...education,
      resumeId: id,
      bullets: data.educationBullets.filter((bullet) => bullet.educationId === education.id),
    })),
    projects: data.projects.map(({ userId: _userId, ...project }) => ({
      ...project,
      resumeId: id,
    })),
    skillGroups: data.skillGroups.map(({ userId: _userId, ...group }) => ({
      ...group,
      resumeId: id,
      skills: data.skills.filter((skill) => skill.groupId === group.id),
    })),
    talks: data.talks.map(({ userId: _userId, ...talk }) => ({ ...talk, resumeId: id })),
    certifications: [],
    volunteers: [],
    languages: [],
  };
}

export function createLocalResumeDetail(doc: ResumeDocumentV1): ResumeDetailDTO {
  const createdAt = nowIso();
  return {
    ...resumeDocumentToDetail({
      id: crypto.randomUUID(),
      userId: LOCAL_ANONYMOUS_USER_ID,
      name: "Local Resume",
      description: "Stored only in this browser",
      jobDescription: "",
      createdAt,
      doc,
    }),
    createdAt,
  };
}
