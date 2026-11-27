import type {
  Job,
  JobStatus,
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
} from "../rows/index.ts";

export type SnapshotJobStatus = JobStatus;
export type ResumeSnapshot = Resume;
export type ContactSnapshot = ResumeContact;
export type LinkSnapshot = ResumeLink;
export type SummarySnapshot = ResumeSummary;
export type NoteSnapshot = ResumeNote;
export type ExperienceSnapshot = ResumeExperience;
export type ExperienceBulletSnapshot = ResumeExperienceBullet;
export type EducationSnapshot = ResumeEducation;
export type EducationBulletSnapshot = ResumeEducationBullet;
export type ProjectSnapshot = ResumeProject;
export type SkillGroupSnapshot = ResumeSkillGroup;
export type SkillSnapshot = ResumeSkill;
export type TalkSnapshot = ResumeTalk;
export type CertificationSnapshot = ResumeCertification;
export type VolunteerSnapshot = ResumeVolunteer;
export type LanguageSnapshot = ResumeLanguage;
export type JobSnapshot = Job;

/** The résumé row plus the owner's library rows its layout can point at. */
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
