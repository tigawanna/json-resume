import { publicResume } from "../schema/resume/public-resume.ts";
import { resume } from "../schema/resume/resume.ts";
import {
  resumeAiChat,
  resumeAiConversation,
  resumeAiMessage,
} from "../schema/resume/resume-ai-chat.ts";
import { resumeCertification } from "../schema/resume/resume-certification.ts";
import { resumeContact } from "../schema/resume/resume-contact.ts";
import { resumeEducation, resumeEducationBullet } from "../schema/resume/resume-education.ts";
import { resumeExperience, resumeExperienceBullet } from "../schema/resume/resume-experience.ts";
import { resumeLanguage } from "../schema/resume/resume-language.ts";
import { resumeLink } from "../schema/resume/resume-link.ts";
import { resumeNote } from "../schema/resume/resume-note.ts";
import { resumeProject } from "../schema/resume/resume-project.ts";
import { resumeSkill, resumeSkillGroup } from "../schema/resume/resume-skill.ts";
import { resumeSummary } from "../schema/resume/resume-summary.ts";
import { resumeTalk } from "../schema/resume/resume-talk.ts";
import { resumeVolunteer } from "../schema/resume/resume-volunteer.ts";
import { drizzleZod } from "./table.ts";

export const resumeZod = drizzleZod({ table: resume });
export const publicResumeZod = drizzleZod({ table: publicResume });
export const resumeAiChatZod = drizzleZod({ table: resumeAiChat });
export const resumeAiConversationZod = drizzleZod({ table: resumeAiConversation });
export const resumeAiMessageZod = drizzleZod({ table: resumeAiMessage });
export const resumeCertificationZod = drizzleZod({ table: resumeCertification });
export const resumeContactZod = drizzleZod({ table: resumeContact });
export const resumeEducationZod = drizzleZod({ table: resumeEducation });
export const resumeEducationBulletZod = drizzleZod({ table: resumeEducationBullet });
export const resumeExperienceZod = drizzleZod({ table: resumeExperience });
export const resumeExperienceBulletZod = drizzleZod({ table: resumeExperienceBullet });
export const resumeLanguageZod = drizzleZod({ table: resumeLanguage });
export const resumeLinkZod = drizzleZod({ table: resumeLink });
export const resumeNoteZod = drizzleZod({ table: resumeNote });
export const resumeProjectZod = drizzleZod({ table: resumeProject });
export const resumeSkillGroupZod = drizzleZod({ table: resumeSkillGroup });
export const resumeSkillZod = drizzleZod({ table: resumeSkill });
export const resumeSummaryZod = drizzleZod({ table: resumeSummary });
export const resumeTalkZod = drizzleZod({ table: resumeTalk });
export const resumeVolunteerZod = drizzleZod({ table: resumeVolunteer });
