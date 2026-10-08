import { relations } from "drizzle-orm";
import { user } from "../auth-schema";
import { resume } from "./resume";
import { job } from "../job-schema";
import { resumeAiChat, resumeAiConversation, resumeAiMessage } from "./resume-ai-chat";
import { resumeCertification } from "./resume-certification";
import { resumeContact } from "./resume-contact";
import { resumeEducation, resumeEducationBullet } from "./resume-education";
import { resumeExperience, resumeExperienceBullet } from "./resume-experience";
import { resumeLanguage } from "./resume-language";
import { resumeLink } from "./resume-link";
import { resumeNote } from "./resume-note";
import { resumeProject } from "./resume-project";
import { resumeSkill, resumeSkillGroup } from "./resume-skill";
import { resumeSummary } from "./resume-summary";
import { resumeTalk } from "./resume-talk";
import { resumeVolunteer } from "./resume-volunteer";

export const resumeRelations = relations(resume, ({ one, many }) => ({
  user: one(user, { fields: [resume.userId], references: [user.id] }),
  job: one(job, { fields: [resume.jobId], references: [job.id] }),
  aiChats: many(resumeAiChat),
  aiConversations: many(resumeAiConversation),
}));

export const resumeAiChatRelations = relations(resumeAiChat, ({ one }) => ({
  user: one(user, { fields: [resumeAiChat.userId], references: [user.id] }),
  resume: one(resume, { fields: [resumeAiChat.resumeId], references: [resume.id] }),
}));

export const resumeAiConversationRelations = relations(resumeAiConversation, ({ one, many }) => ({
  user: one(user, { fields: [resumeAiConversation.userId], references: [user.id] }),
  resume: one(resume, { fields: [resumeAiConversation.resumeId], references: [resume.id] }),
  messages: many(resumeAiMessage),
}));

export const resumeAiMessageRelations = relations(resumeAiMessage, ({ one }) => ({
  conversation: one(resumeAiConversation, {
    fields: [resumeAiMessage.conversationId],
    references: [resumeAiConversation.id],
  }),
}));

export const resumeContactRelations = relations(resumeContact, ({ one }) => ({
  user: one(user, { fields: [resumeContact.userId], references: [user.id] }),
}));

export const resumeLinkRelations = relations(resumeLink, ({ one }) => ({
  user: one(user, { fields: [resumeLink.userId], references: [user.id] }),
}));

export const resumeSummaryRelations = relations(resumeSummary, ({ one }) => ({
  user: one(user, { fields: [resumeSummary.userId], references: [user.id] }),
}));

export const resumeNoteRelations = relations(resumeNote, ({ one }) => ({
  user: one(user, { fields: [resumeNote.userId], references: [user.id] }),
}));

export const resumeExperienceRelations = relations(resumeExperience, ({ one, many }) => ({
  user: one(user, { fields: [resumeExperience.userId], references: [user.id] }),
  bullets: many(resumeExperienceBullet),
}));

export const resumeExperienceBulletRelations = relations(resumeExperienceBullet, ({ one }) => ({
  experience: one(resumeExperience, {
    fields: [resumeExperienceBullet.experienceId],
    references: [resumeExperience.id],
  }),
}));

export const resumeEducationRelations = relations(resumeEducation, ({ one, many }) => ({
  user: one(user, { fields: [resumeEducation.userId], references: [user.id] }),
  bullets: many(resumeEducationBullet),
}));

export const resumeEducationBulletRelations = relations(resumeEducationBullet, ({ one }) => ({
  education: one(resumeEducation, {
    fields: [resumeEducationBullet.educationId],
    references: [resumeEducation.id],
  }),
}));

export const resumeProjectRelations = relations(resumeProject, ({ one }) => ({
  user: one(user, { fields: [resumeProject.userId], references: [user.id] }),
}));

export const resumeSkillGroupRelations = relations(resumeSkillGroup, ({ one }) => ({
  user: one(user, { fields: [resumeSkillGroup.userId], references: [user.id] }),
}));

export const resumeSkillRelations = relations(resumeSkill, ({ one }) => ({
  user: one(user, { fields: [resumeSkill.userId], references: [user.id] }),
}));

export const resumeTalkRelations = relations(resumeTalk, ({ one }) => ({
  user: one(user, { fields: [resumeTalk.userId], references: [user.id] }),
}));

export const resumeCertificationRelations = relations(resumeCertification, ({ one }) => ({
  user: one(user, { fields: [resumeCertification.userId], references: [user.id] }),
}));

export const resumeVolunteerRelations = relations(resumeVolunteer, ({ one }) => ({
  user: one(user, { fields: [resumeVolunteer.userId], references: [user.id] }),
}));

export const resumeLanguageRelations = relations(resumeLanguage, ({ one }) => ({
  user: one(user, { fields: [resumeLanguage.userId], references: [user.id] }),
}));
