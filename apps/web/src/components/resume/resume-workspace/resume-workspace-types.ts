import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import type { ResumeDocumentV1, TemplateId } from "@/features/resume/resume-schema";

export interface ContactDraft {
  type: string;
  value: string;
  label: string;
}

export interface LinkDraft {
  label: string;
  url: string;
  icon?: string;
}

export interface SkillGroupDraft {
  name: string;
  items: string[];
}

export interface ExperienceDraft {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  location: string;
}

export interface EducationDraft {
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ProjectDraft {
  name: string;
  url: string;
  homepageUrl: string;
  description: string;
  tech: string[];
}

export interface TalkDraft {
  title: string;
  event: string;
  date: string;
  description: string;
  links?: { label: string; url: string }[];
}

export interface ResumeMetadataDraft {
  name: string;
  fullName: string;
  headline: string;
  description: string;
  jobDescription: string;
  templateId: TemplateId;
}

export interface ResumeSearchAdapter {
  experiences?: (
    query: string,
  ) => Promise<{ id: string; company: string; role: string; startDate: string; endDate: string }[]>;
  experienceBullets?: (query: string) => Promise<{ id: string; text: string }[]>;
  education?: (
    query: string,
  ) => Promise<{ id: string; school: string; degree: string; field: string }[]>;
  projects?: (query: string) => Promise<
    {
      id: string;
      name: string;
      description: string;
      url: string;
      homepageUrl: string;
      tech: string;
    }[]
  >;
  skills?: (query: string) => Promise<{ id: string; name: string; groupName?: string }[]>;
  talks?: (query: string) => Promise<{ id: string; title: string; event: string; date: string }[]>;
}

export interface ResumeWorkspaceAdapter {
  mode: "remote" | "local";
  resume: ResumeDetailDTO;
  searches?: ResumeSearchAdapter;
  updateMetadata(values: ResumeMetadataDraft): Promise<void>;
  updateContacts(contacts: ContactDraft[]): Promise<void>;
  updateLinks(links: LinkDraft[]): Promise<void>;
  updateSummary(text: string): Promise<void>;
  updateSkillGroups(groups: SkillGroupDraft[]): Promise<void>;
  createExperience(values: ExperienceDraft): Promise<{ id: string }>;
  updateExperience(id: string, values: ExperienceDraft): Promise<void>;
  deleteExperience(id: string): Promise<void>;
  updateExperienceBullets(experienceId: string, bullets: string[]): Promise<void>;
  createEducation(values: EducationDraft): Promise<{ id: string }>;
  updateEducation(id: string, values: EducationDraft): Promise<void>;
  deleteEducation(id: string): Promise<void>;
  createProject(values: ProjectDraft): Promise<{ id: string }>;
  updateProject(id: string, values: ProjectDraft): Promise<void>;
  deleteProject(id: string): Promise<void>;
  createTalk(values: TalkDraft): Promise<{ id: string }>;
  updateTalk(id: string, values: TalkDraft): Promise<void>;
  deleteTalk(id: string): Promise<void>;
  replaceDocument(doc: ResumeDocumentV1): Promise<void>;
}
