import { publicResume } from "../schema/resume/public-resume";
import { resume } from "../schema/resume/resume";
import {
  resumeAiChat,
  resumeAiConversation,
  resumeAiMessage,
} from "../schema/resume/resume-ai-chat";
import { resumeCertification } from "../schema/resume/resume-certification";
import { resumeContact } from "../schema/resume/resume-contact";
import {
  resumeEducation,
  resumeEducationBullet,
} from "../schema/resume/resume-education";
import {
  resumeExperience,
  resumeExperienceBullet,
} from "../schema/resume/resume-experience";
import { resumeLanguage } from "../schema/resume/resume-language";
import { resumeLink } from "../schema/resume/resume-link";
import { resumeNote } from "../schema/resume/resume-note";
import { resumeProject } from "../schema/resume/resume-project";
import { resumeSkill, resumeSkillGroup } from "../schema/resume/resume-skill";
import { resumeSummary } from "../schema/resume/resume-summary";
import { resumeTalk } from "../schema/resume/resume-talk";
import { resumeVolunteer } from "../schema/resume/resume-volunteer";
import { drizzleZod } from "./table";

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
