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
import { drizzleEmbeddableZod, drizzleZod } from "./table.ts";

export const resumeZod = drizzleEmbeddableZod({ table: resume });
export const publicResumeZod = drizzleZod({ table: publicResume });
export const resumeAiChatZod = drizzleZod({ table: resumeAiChat });
export const resumeAiConversationZod = drizzleZod({ table: resumeAiConversation });
export const resumeAiMessageZod = drizzleZod({ table: resumeAiMessage });
export const resumeCertificationZod = drizzleEmbeddableZod({ table: resumeCertification });
export const resumeContactZod = drizzleEmbeddableZod({ table: resumeContact });
export const resumeEducationZod = drizzleEmbeddableZod({ table: resumeEducation });
export const resumeEducationBulletZod = drizzleEmbeddableZod({ table: resumeEducationBullet });
export const resumeExperienceZod = drizzleEmbeddableZod({ table: resumeExperience });
export const resumeExperienceBulletZod = drizzleEmbeddableZod({ table: resumeExperienceBullet });
export const resumeLanguageZod = drizzleEmbeddableZod({ table: resumeLanguage });
export const resumeLinkZod = drizzleEmbeddableZod({ table: resumeLink });
export const resumeNoteZod = drizzleEmbeddableZod({ table: resumeNote });
export const resumeProjectZod = drizzleEmbeddableZod({ table: resumeProject });
export const resumeSkillGroupZod = drizzleEmbeddableZod({ table: resumeSkillGroup });
export const resumeSkillZod = drizzleEmbeddableZod({ table: resumeSkill });
export const resumeSummaryZod = drizzleEmbeddableZod({ table: resumeSummary });
export const resumeTalkZod = drizzleEmbeddableZod({ table: resumeTalk });
export const resumeVolunteerZod = drizzleEmbeddableZod({ table: resumeVolunteer });
