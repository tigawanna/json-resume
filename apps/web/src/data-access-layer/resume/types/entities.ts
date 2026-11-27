export interface ResumeSectionRow {
  id: string;
  resumeId: string;
  key: string;
  title: string;
  enabled: boolean;
  sortOrder: number;
}

export interface ResumeContactRow {
  id: string;
  resumeId: string;
  type: string;
  value: string;
  label: string;
  sortOrder: number;
}

export interface ResumeLinkRow {
  id: string;
  resumeId: string;
  label: string;
  url: string;
  icon: string | null;
  sortOrder: number;
}

export interface ResumeSummaryRow {
  id: string;
  resumeId: string;
  text: string;
  sortOrder: number;
}

export interface ResumeNoteRow {
  id: string;
  resumeId: string;
  label: string;
  text: string;
  sortOrder: number;
}

export interface ResumeExperienceRow {
  id: string;
  resumeId: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  location: string;
  sortOrder: number;
}

export interface ResumeExperienceBulletRow {
  id: string;
  experienceId: string;
  text: string;
  sortOrder: number;
}

export interface ResumeEducationRow {
  id: string;
  resumeId: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  description: string;
  sortOrder: number;
}

export interface ResumeEducationBulletRow {
  id: string;
  educationId: string;
  text: string;
  sortOrder: number;
}

export interface ResumeProjectRow {
  id: string;
  resumeId: string;
  name: string;
  url: string;
  homepageUrl: string;
  description: string;
  tech: string;
  sortOrder: number;
}

export interface ResumeSkillGroupRow {
  id: string;
  resumeId: string;
  name: string;
  sortOrder: number;
}

export interface ResumeSkillRow {
  id: string;
  groupId: string;
  name: string;
  level: string | null;
  sortOrder: number;
}

export interface ResumeTalkRow {
  id: string;
  resumeId: string;
  title: string;
  event: string;
  date: string;
  description: string;
  links: string;
  sortOrder: number;
}

export interface ResumeCertificationRow {
  id: string;
  resumeId: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
  sortOrder: number;
}

export interface ResumeVolunteerRow {
  id: string;
  resumeId: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  sortOrder: number;
}

export interface ResumeLanguageRow {
  id: string;
  resumeId: string;
  name: string;
  proficiency: string;
  sortOrder: number;
}
