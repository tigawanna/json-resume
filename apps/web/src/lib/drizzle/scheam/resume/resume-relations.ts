import { relations } from "drizzle-orm";
import { user } from "../auth-schema";
import { resume, resumeSection } from "./resume";
import { resumeAiChat } from "./resume-ai-chat";
import { resumeCertification } from "./resume-certification";
import { resumeContact } from "./resume-contact";
import { resumeEducation, resumeEducationBullet } from "./resume-education";
import { resumeExperience, resumeExperienceBullet } from "./resume-experience";
import { resumeLanguage } from "./resume-language";
import { resumeLink } from "./resume-link";
import { resumeProject } from "./resume-project";
import { resumeSkill, resumeSkillGroup } from "./resume-skill";
import { resumeSummary } from "./resume-summary";
import { resumeTalk } from "./resume-talk";
import { resumeVolunteer } from "./resume-volunteer";

export const resumeRelations = relations(resume, ({ one, many }) => ({
  user: one(user, { fields: [resume.userId], references: [user.id] }),
  sections: many(resumeSection),
  contacts: many(resumeContact),
  links: many(resumeLink),
  summaries: many(resumeSummary),
  experiences: many(resumeExperience),
  education: many(resumeEducation),
  projects: many(resumeProject),
  skillGroups: many(resumeSkillGroup),
  talks: many(resumeTalk),
  certifications: many(resumeCertification),
  volunteers: many(resumeVolunteer),
  languages: many(resumeLanguage),
  aiChats: many(resumeAiChat),
}));

export const resumeSectionRelations = relations(resumeSection, ({ one }) => ({
  resume: one(resume, { fields: [resumeSection.resumeId], references: [resume.id] }),
}));

export const resumeAiChatRelations = relations(resumeAiChat, ({ one }) => ({
  user: one(user, { fields: [resumeAiChat.userId], references: [user.id] }),
  resume: one(resume, { fields: [resumeAiChat.resumeId], references: [resume.id] }),
}));

export const resumeContactRelations = relations(resumeContact, ({ one }) => ({
  resume: one(resume, { fields: [resumeContact.resumeId], references: [resume.id] }),
}));

export const resumeLinkRelations = relations(resumeLink, ({ one }) => ({
  resume: one(resume, { fields: [resumeLink.resumeId], references: [resume.id] }),
}));

export const resumeSummaryRelations = relations(resumeSummary, ({ one }) => ({
  resume: one(resume, { fields: [resumeSummary.resumeId], references: [resume.id] }),
}));

export const resumeExperienceRelations = relations(resumeExperience, ({ one, many }) => ({
  resume: one(resume, { fields: [resumeExperience.resumeId], references: [resume.id] }),
  bullets: many(resumeExperienceBullet),
}));

export const resumeExperienceBulletRelations = relations(resumeExperienceBullet, ({ one }) => ({
  experience: one(resumeExperience, {
    fields: [resumeExperienceBullet.experienceId],
    references: [resumeExperience.id],
  }),
}));

export const resumeEducationRelations = relations(resumeEducation, ({ one, many }) => ({
  resume: one(resume, { fields: [resumeEducation.resumeId], references: [resume.id] }),
  bullets: many(resumeEducationBullet),
}));

export const resumeEducationBulletRelations = relations(resumeEducationBullet, ({ one }) => ({
  education: one(resumeEducation, {
    fields: [resumeEducationBullet.educationId],
    references: [resumeEducation.id],
  }),
}));

export const resumeProjectRelations = relations(resumeProject, ({ one }) => ({
  resume: one(resume, { fields: [resumeProject.resumeId], references: [resume.id] }),
}));

export const resumeSkillGroupRelations = relations(resumeSkillGroup, ({ one, many }) => ({
  resume: one(resume, { fields: [resumeSkillGroup.resumeId], references: [resume.id] }),
  skills: many(resumeSkill),
}));

export const resumeSkillRelations = relations(resumeSkill, ({ one }) => ({
  group: one(resumeSkillGroup, {
    fields: [resumeSkill.groupId],
    references: [resumeSkillGroup.id],
  }),
}));

export const resumeTalkRelations = relations(resumeTalk, ({ one }) => ({
  resume: one(resume, { fields: [resumeTalk.resumeId], references: [resume.id] }),
}));

export const resumeCertificationRelations = relations(resumeCertification, ({ one }) => ({
  resume: one(resume, { fields: [resumeCertification.resumeId], references: [resume.id] }),
}));

export const resumeVolunteerRelations = relations(resumeVolunteer, ({ one }) => ({
  resume: one(resume, { fields: [resumeVolunteer.resumeId], references: [resume.id] }),
}));

export const resumeLanguageRelations = relations(resumeLanguage, ({ one }) => ({
  resume: one(resume, { fields: [resumeLanguage.resumeId], references: [resume.id] }),
}));
