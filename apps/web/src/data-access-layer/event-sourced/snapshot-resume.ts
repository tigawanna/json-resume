import type { AppDb } from "./collection";
import type { EventSourcedResumeSnapshots } from "./assemble-resume-detail";

function rows<T>(collection: { toArray: ReadonlyArray<T> }): T[] {
  return [...collection.toArray];
}

export function snapshotEventSourcedResume(
  db: AppDb,
  resumeId: string,
): EventSourcedResumeSnapshots {
  return {
    resume: rows(db.collections.resume).find((row) => row.id === resumeId),
    contacts: rows(db.collections.resumeContact),
    links: rows(db.collections.resumeLink),
    summaries: rows(db.collections.resumeSummary),
    notes: rows(db.collections.resumeNote),
    experiences: rows(db.collections.resumeExperience),
    experienceBullets: rows(db.collections.resumeExperienceBullet),
    education: rows(db.collections.resumeEducation),
    educationBullets: rows(db.collections.resumeEducationBullet),
    projects: rows(db.collections.resumeProject),
    skillGroups: rows(db.collections.resumeSkillGroup),
    skills: rows(db.collections.resumeSkill),
    talks: rows(db.collections.resumeTalk),
    certifications: rows(db.collections.resumeCertification),
    volunteers: rows(db.collections.resumeVolunteer),
    languages: rows(db.collections.resumeLanguage),
    jobs: rows(db.collections.job),
  };
}
