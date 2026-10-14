import type { AppDb } from "../../collection";
import { HISTORY_RESUMES, HISTORY_UPDATES } from "./history";
import { seedResume } from "./resume";
import { seedResumeCertification } from "./resume-certification";
import { seedResumeContact } from "./resume-contact";
import { seedResumeEducation } from "./resume-education";
import { seedResumeEducationBullet } from "./resume-education-bullet";
import { seedResumeExperience } from "./resume-experience";
import { seedResumeExperienceBullet } from "./resume-experience-bullet";
import { seedResumeLanguage } from "./resume-language";
import { seedResumeLink } from "./resume-link";
import { seedResumeNote } from "./resume-note";
import { seedResumeProject } from "./resume-project";
import { seedResumeSkill } from "./resume-skill";
import { seedResumeSkillGroup } from "./resume-skill-group";
import { seedResumeSummary } from "./resume-summary";
import { seedResumeTalk } from "./resume-talk";
import { seedResumeVolunteer } from "./resume-volunteer";

export type SeededRow = { collectionId: string; id: string };

export type SeedHistoryOptions = {
  resumes?: number;
  updates?: number;
};

/**
 * One create and `updates` edits for a résumé and one row of each library child.
 * Defaults match a person who keeps about 50 résumés and edits each section often.
 */
export async function seedHistory(db: AppDb, options: SeedHistoryOptions = {}) {
  const resumes = options.resumes ?? HISTORY_RESUMES;
  const updates = options.updates ?? HISTORY_UPDATES;
  const rows: SeededRow[] = [];

  for (let index = 0; index < resumes; index++) {
    const experienceId = await seedResumeExperience(db, index, updates);
    const bulletId = await seedResumeExperienceBullet(db, index, experienceId, updates);
    const educationId = await seedResumeEducation(db, index, updates);
    const educationBulletId = await seedResumeEducationBullet(db, index, educationId, updates);
    const skillId = await seedResumeSkill(db, index, updates);
    const skillGroupId = await seedResumeSkillGroup(db, index, updates);
    const projectId = await seedResumeProject(db, index, updates);
    const talkId = await seedResumeTalk(db, index, updates);
    const contactId = await seedResumeContact(db, index, updates);
    const linkId = await seedResumeLink(db, index, updates);
    const summaryId = await seedResumeSummary(db, index, updates);
    const noteId = await seedResumeNote(db, index, updates);
    const certificationId = await seedResumeCertification(db, index, updates);
    const volunteerId = await seedResumeVolunteer(db, index, updates);
    const languageId = await seedResumeLanguage(db, index, updates);
    const resumeId = await seedResume(db, index, updates, {
      experienceId,
      bulletId,
      skillGroupId,
      skillId,
      educationId,
      projectId,
      talkId,
      contactId,
      linkId,
      summaryId,
      noteId,
      certificationId,
      volunteerId,
      languageId,
    });

    rows.push(
      { collectionId: "resume", id: resumeId },
      { collectionId: "resumeExperience", id: experienceId },
      { collectionId: "resumeExperienceBullet", id: bulletId },
      { collectionId: "resumeEducation", id: educationId },
      { collectionId: "resumeEducationBullet", id: educationBulletId },
      { collectionId: "resumeSkill", id: skillId },
      { collectionId: "resumeSkillGroup", id: skillGroupId },
      { collectionId: "resumeProject", id: projectId },
      { collectionId: "resumeTalk", id: talkId },
      { collectionId: "resumeContact", id: contactId },
      { collectionId: "resumeLink", id: linkId },
      { collectionId: "resumeSummary", id: summaryId },
      { collectionId: "resumeNote", id: noteId },
      { collectionId: "resumeCertification", id: certificationId },
      { collectionId: "resumeVolunteer", id: volunteerId },
      { collectionId: "resumeLanguage", id: languageId },
    );
  }

  return { resumes, updates, rows };
}
