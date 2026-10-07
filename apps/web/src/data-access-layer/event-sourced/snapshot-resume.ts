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
    sections: rows(db.collections.resumeSection),
    contacts: rows(db.collections.resumeContact),
    contactItems: rows(db.collections.resumeContactItem),
    links: rows(db.collections.resumeLink),
    linkItems: rows(db.collections.resumeLinkItem),
    summaries: rows(db.collections.resumeSummary),
    summaryItems: rows(db.collections.resumeSummaryItem),
    notes: rows(db.collections.resumeNote),
    noteItems: rows(db.collections.resumeNoteItem),
    experiences: rows(db.collections.resumeExperience),
    experienceItems: rows(db.collections.resumeExperienceItem),
    experienceBullets: rows(db.collections.resumeExperienceBullet),
    experienceBulletItems: rows(db.collections.resumeExperienceBulletItem),
    education: rows(db.collections.resumeEducation),
    educationItems: rows(db.collections.resumeEducationItem),
    educationBullets: rows(db.collections.resumeEducationBullet),
    projects: rows(db.collections.resumeProject),
    projectItems: rows(db.collections.resumeProjectItem),
    skillGroups: rows(db.collections.resumeSkillGroup),
    skillGroupItems: rows(db.collections.resumeSkillGroupItem),
    skills: rows(db.collections.resumeSkill),
    skillGroupSkills: rows(db.collections.resumeSkillGroupSkill),
    talks: rows(db.collections.resumeTalk),
    talkItems: rows(db.collections.resumeTalkItem),
    certifications: rows(db.collections.resumeCertification),
    certificationItems: rows(db.collections.resumeCertificationItem),
    volunteers: rows(db.collections.resumeVolunteer),
    volunteerItems: rows(db.collections.resumeVolunteerItem),
    languages: rows(db.collections.resumeLanguage),
    languageItems: rows(db.collections.resumeLanguageItem),
    jobs: rows(db.collections.job),
  };
}
