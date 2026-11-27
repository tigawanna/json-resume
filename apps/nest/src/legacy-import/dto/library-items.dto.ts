import {
  resumeCertificationZod,
  resumeContactZod,
  resumeEducationZod,
  resumeExperienceBulletZod,
  resumeExperienceZod,
  resumeLanguageZod,
  resumeLinkZod,
  resumeProjectZod,
  resumeSkillGroupZod,
  resumeSummaryZod,
  resumeTalkZod,
  resumeVolunteerZod,
} from '@repo/db/postgres/zod';
import { z } from 'zod';

const isoDate = z.iso.datetime();
const timestamps = { createdAt: isoDate, updatedAt: isoDate };

export const talkListItemSchema = resumeTalkZod.select
  .pick({
    id: true,
    title: true,
    event: true,
    date: true,
    description: true,
    links: true,
    sortOrder: true,
  })
  .extend(timestamps);

export const linkListItemSchema = resumeLinkZod.select
  .pick({ id: true, label: true, url: true, icon: true, sortOrder: true })
  .extend(timestamps);

export const projectListItemSchema = resumeProjectZod.select
  .pick({
    id: true,
    name: true,
    url: true,
    homepageUrl: true,
    description: true,
    tech: true,
    sortOrder: true,
  })
  .extend(timestamps);

export const certificationListItemSchema = resumeCertificationZod.select
  .pick({
    id: true,
    name: true,
    issuer: true,
    date: true,
    url: true,
    sortOrder: true,
  })
  .extend(timestamps);

export const languageListItemSchema = resumeLanguageZod.select
  .pick({ id: true, name: true, proficiency: true, sortOrder: true })
  .extend(timestamps);

export const skillGroupListItemSchema = resumeSkillGroupZod.select
  .pick({ id: true, name: true, sortOrder: true })
  .extend({ ...timestamps, skills: z.string() });

export const experienceBulletSchema = resumeExperienceBulletZod.select.pick({
  id: true,
  text: true,
  sortOrder: true,
});

export const experienceListItemSchema = resumeExperienceZod.select
  .pick({
    id: true,
    company: true,
    role: true,
    startDate: true,
    endDate: true,
    location: true,
    sortOrder: true,
  })
  .extend({ ...timestamps, bullets: z.array(experienceBulletSchema) });

export const educationListItemSchema = resumeEducationZod.select
  .pick({
    id: true,
    school: true,
    degree: true,
    field: true,
    startDate: true,
    endDate: true,
    description: true,
    sortOrder: true,
  })
  .extend(timestamps);

export const volunteerListItemSchema = resumeVolunteerZod.select
  .pick({
    id: true,
    organization: true,
    role: true,
    startDate: true,
    endDate: true,
    description: true,
    sortOrder: true,
  })
  .extend(timestamps);

export const contactListItemSchema = resumeContactZod.select
  .pick({ id: true, type: true, value: true, label: true, sortOrder: true })
  .extend(timestamps);

export const summaryListItemSchema = resumeSummaryZod.select
  .pick({ id: true, text: true, sortOrder: true })
  .extend(timestamps);
