import { relations } from "drizzle-orm";
import { user } from "../auth-schema";
import { resume, resumeSection } from "./resume";
import { resumeAiChat, resumeAiConversation, resumeAiMessage } from "./resume-ai-chat";
import { resumeCertification, resumeCertificationItem } from "./resume-certification";
import { resumeContact, resumeContactItem } from "./resume-contact";
import { resumeEducation, resumeEducationBullet, resumeEducationItem } from "./resume-education";
import {
  resumeExperience,
  resumeExperienceBullet,
  resumeExperienceItem,
} from "./resume-experience";
import { resumeLanguage, resumeLanguageItem } from "./resume-language";
import { resumeLink, resumeLinkItem } from "./resume-link";
import { resumeProject, resumeProjectItem } from "./resume-project";
import { resumeSkill, resumeSkillGroup, resumeSkillGroupItem } from "./resume-skill";
import { resumeSummary, resumeSummaryItem } from "./resume-summary";
import { resumeTalk, resumeTalkItem } from "./resume-talk";
import { resumeVolunteer, resumeVolunteerItem } from "./resume-volunteer";

export const resumeRelations = relations(resume, ({ one, many }) => ({
  user: one(user, { fields: [resume.userId], references: [user.id] }),
  sections: many(resumeSection),
  contacts: many(resumeContactItem),
  links: many(resumeLinkItem),
  summaries: many(resumeSummaryItem),
  experiences: many(resumeExperienceItem),
  education: many(resumeEducationItem),
  projects: many(resumeProjectItem),
  skillGroups: many(resumeSkillGroupItem),
  talks: many(resumeTalkItem),
  certifications: many(resumeCertificationItem),
  volunteers: many(resumeVolunteerItem),
  languages: many(resumeLanguageItem),
  aiChats: many(resumeAiChat),
  aiConversations: many(resumeAiConversation),
}));

export const resumeSectionRelations = relations(resumeSection, ({ one }) => ({
  resume: one(resume, { fields: [resumeSection.resumeId], references: [resume.id] }),
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

export const resumeContactRelations = relations(resumeContact, ({ one, many }) => ({
  user: one(user, { fields: [resumeContact.userId], references: [user.id] }),
  resumes: many(resumeContactItem),
}));

export const resumeContactItemRelations = relations(resumeContactItem, ({ one }) => ({
  resume: one(resume, { fields: [resumeContactItem.resumeId], references: [resume.id] }),
  contact: one(resumeContact, {
    fields: [resumeContactItem.contactId],
    references: [resumeContact.id],
  }),
}));

export const resumeLinkRelations = relations(resumeLink, ({ one, many }) => ({
  user: one(user, { fields: [resumeLink.userId], references: [user.id] }),
  resumes: many(resumeLinkItem),
}));

export const resumeLinkItemRelations = relations(resumeLinkItem, ({ one }) => ({
  resume: one(resume, { fields: [resumeLinkItem.resumeId], references: [resume.id] }),
  link: one(resumeLink, { fields: [resumeLinkItem.linkId], references: [resumeLink.id] }),
}));

export const resumeSummaryRelations = relations(resumeSummary, ({ one, many }) => ({
  user: one(user, { fields: [resumeSummary.userId], references: [user.id] }),
  resumes: many(resumeSummaryItem),
}));

export const resumeSummaryItemRelations = relations(resumeSummaryItem, ({ one }) => ({
  resume: one(resume, { fields: [resumeSummaryItem.resumeId], references: [resume.id] }),
  summary: one(resumeSummary, {
    fields: [resumeSummaryItem.summaryId],
    references: [resumeSummary.id],
  }),
}));

export const resumeExperienceRelations = relations(resumeExperience, ({ one, many }) => ({
  user: one(user, { fields: [resumeExperience.userId], references: [user.id] }),
  resumes: many(resumeExperienceItem),
  bullets: many(resumeExperienceBullet),
}));

export const resumeExperienceItemRelations = relations(resumeExperienceItem, ({ one }) => ({
  resume: one(resume, { fields: [resumeExperienceItem.resumeId], references: [resume.id] }),
  experience: one(resumeExperience, {
    fields: [resumeExperienceItem.experienceId],
    references: [resumeExperience.id],
  }),
}));

export const resumeExperienceBulletRelations = relations(resumeExperienceBullet, ({ one }) => ({
  experience: one(resumeExperience, {
    fields: [resumeExperienceBullet.experienceId],
    references: [resumeExperience.id],
  }),
}));

export const resumeEducationRelations = relations(resumeEducation, ({ one, many }) => ({
  user: one(user, { fields: [resumeEducation.userId], references: [user.id] }),
  resumes: many(resumeEducationItem),
  bullets: many(resumeEducationBullet),
}));

export const resumeEducationItemRelations = relations(resumeEducationItem, ({ one }) => ({
  resume: one(resume, { fields: [resumeEducationItem.resumeId], references: [resume.id] }),
  education: one(resumeEducation, {
    fields: [resumeEducationItem.educationId],
    references: [resumeEducation.id],
  }),
}));

export const resumeEducationBulletRelations = relations(resumeEducationBullet, ({ one }) => ({
  education: one(resumeEducation, {
    fields: [resumeEducationBullet.educationId],
    references: [resumeEducation.id],
  }),
}));

export const resumeProjectRelations = relations(resumeProject, ({ one, many }) => ({
  user: one(user, { fields: [resumeProject.userId], references: [user.id] }),
  resumes: many(resumeProjectItem),
}));

export const resumeProjectItemRelations = relations(resumeProjectItem, ({ one }) => ({
  resume: one(resume, { fields: [resumeProjectItem.resumeId], references: [resume.id] }),
  project: one(resumeProject, {
    fields: [resumeProjectItem.projectId],
    references: [resumeProject.id],
  }),
}));

export const resumeSkillGroupRelations = relations(resumeSkillGroup, ({ one, many }) => ({
  user: one(user, { fields: [resumeSkillGroup.userId], references: [user.id] }),
  resumes: many(resumeSkillGroupItem),
  skills: many(resumeSkill),
}));

export const resumeSkillGroupItemRelations = relations(resumeSkillGroupItem, ({ one }) => ({
  resume: one(resume, { fields: [resumeSkillGroupItem.resumeId], references: [resume.id] }),
  group: one(resumeSkillGroup, {
    fields: [resumeSkillGroupItem.groupId],
    references: [resumeSkillGroup.id],
  }),
}));

export const resumeSkillRelations = relations(resumeSkill, ({ one }) => ({
  group: one(resumeSkillGroup, {
    fields: [resumeSkill.groupId],
    references: [resumeSkillGroup.id],
  }),
}));

export const resumeTalkRelations = relations(resumeTalk, ({ one, many }) => ({
  user: one(user, { fields: [resumeTalk.userId], references: [user.id] }),
  resumes: many(resumeTalkItem),
}));

export const resumeTalkItemRelations = relations(resumeTalkItem, ({ one }) => ({
  resume: one(resume, { fields: [resumeTalkItem.resumeId], references: [resume.id] }),
  talk: one(resumeTalk, { fields: [resumeTalkItem.talkId], references: [resumeTalk.id] }),
}));

export const resumeCertificationRelations = relations(resumeCertification, ({ one, many }) => ({
  user: one(user, { fields: [resumeCertification.userId], references: [user.id] }),
  resumes: many(resumeCertificationItem),
}));

export const resumeCertificationItemRelations = relations(resumeCertificationItem, ({ one }) => ({
  resume: one(resume, { fields: [resumeCertificationItem.resumeId], references: [resume.id] }),
  certification: one(resumeCertification, {
    fields: [resumeCertificationItem.certificationId],
    references: [resumeCertification.id],
  }),
}));

export const resumeVolunteerRelations = relations(resumeVolunteer, ({ one, many }) => ({
  user: one(user, { fields: [resumeVolunteer.userId], references: [user.id] }),
  resumes: many(resumeVolunteerItem),
}));

export const resumeVolunteerItemRelations = relations(resumeVolunteerItem, ({ one }) => ({
  resume: one(resume, { fields: [resumeVolunteerItem.resumeId], references: [resume.id] }),
  volunteer: one(resumeVolunteer, {
    fields: [resumeVolunteerItem.volunteerId],
    references: [resumeVolunteer.id],
  }),
}));

export const resumeLanguageRelations = relations(resumeLanguage, ({ one, many }) => ({
  user: one(user, { fields: [resumeLanguage.userId], references: [user.id] }),
  resumes: many(resumeLanguageItem),
}));

export const resumeLanguageItemRelations = relations(resumeLanguageItem, ({ one }) => ({
  resume: one(resume, { fields: [resumeLanguageItem.resumeId], references: [resume.id] }),
  language: one(resumeLanguage, {
    fields: [resumeLanguageItem.languageId],
    references: [resumeLanguage.id],
  }),
}));
