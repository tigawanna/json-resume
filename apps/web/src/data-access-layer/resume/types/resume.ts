import type { JobStatus } from "@/data-access-layer/event-sourced/schemas";
import type { TemplateId } from "@/features/resume/resume-schema";
import type {
  ResumeCertificationRow,
  ResumeContactRow,
  ResumeEducationBulletRow,
  ResumeEducationRow,
  ResumeExperienceBulletRow,
  ResumeExperienceRow,
  ResumeLanguageRow,
  ResumeLinkRow,
  ResumeNoteRow,
  ResumeProjectRow,
  ResumeSectionRow,
  ResumeSkillGroupRow,
  ResumeSkillRow,
  ResumeSummaryRow,
  ResumeTalkRow,
  ResumeVolunteerRow,
} from "./entities.js";

export interface ResumeRow {
  id: string;
  userId: string;
  name: string;
  fullName: string;
  headline: string;
  description: string;
  jobId?: string | null;
  templateId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumeJobDTO {
  id: string;
  company: string;
  title: string;
  description: string;
  url: string;
  location: string;
  payRate: string;
  status: JobStatus;
}

export interface ResumeDetailDTO {
  id: string;
  userId: string;
  name: string;
  fullName: string;
  headline: string;
  description: string;
  jobDescription: string;
  jobId?: string | null;
  job: ResumeJobDTO | null;
  templateId: TemplateId;
  createdAt: string;
  updatedAt: string;
  sections: ResumeSectionRow[];
  contacts: ResumeContactRow[];
  links: ResumeLinkRow[];
  summaries: ResumeSummaryRow[];
  notes: ResumeNoteRow[];
  experiences: (ResumeExperienceRow & { bullets: ResumeExperienceBulletRow[] })[];
  education: (ResumeEducationRow & { bullets: ResumeEducationBulletRow[] })[];
  projects: ResumeProjectRow[];
  skillGroups: (ResumeSkillGroupRow & { skills: ResumeSkillRow[] })[];
  talks: ResumeTalkRow[];
  certifications: ResumeCertificationRow[];
  volunteers: ResumeVolunteerRow[];
  languages: ResumeLanguageRow[];
}

export interface ResumeListItemDTO {
  id: string;
  name: string;
  fullName: string;
  headline: string;
  description: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
}
