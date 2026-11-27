import { TEMPLATE_IDS } from '@repo/isomorphic/resume/schema';
import { jobStatusSchema } from '@repo/isomorphic/resume/rows';
import { resumeZod } from '@repo/db/postgres/zod';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const isoDate = z.iso.datetime();
const timestamps = { createdAt: isoDate, updatedAt: isoDate };

export const resumeListItemSchema = resumeZod.select
  .pick({
    id: true,
    name: true,
    fullName: true,
    headline: true,
    description: true,
    templateId: true,
  })
  .extend(timestamps);
export class ResumeListItemDto extends createZodDto(resumeListItemSchema) {}

const sectionSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  key: z.string(),
  title: z.string(),
  enabled: z.boolean(),
  sortOrder: z.number(),
});

const contactSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  type: z.string(),
  value: z.string(),
  label: z.string(),
  sortOrder: z.number(),
});

const linkSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  label: z.string(),
  url: z.string(),
  icon: z.string().nullable(),
  sortOrder: z.number(),
});

const summarySchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  text: z.string(),
  sortOrder: z.number(),
});

const noteSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  label: z.string(),
  text: z.string(),
  sortOrder: z.number(),
});

const bulletSchema = z.object({
  id: z.string(),
  text: z.string(),
  sortOrder: z.number(),
});
const experienceSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  company: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string(),
  sortOrder: z.number(),
  bullets: z.array(bulletSchema.extend({ experienceId: z.string() })),
});

const educationSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  school: z.string(),
  degree: z.string(),
  field: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  sortOrder: z.number(),
  bullets: z.array(bulletSchema.extend({ educationId: z.string() })),
});

const projectSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  name: z.string(),
  url: z.string(),
  homepageUrl: z.string(),
  description: z.string(),
  tech: z.string(),
  sortOrder: z.number(),
});

const skillSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  level: z.string().nullable(),
  sortOrder: z.number(),
});
const skillGroupSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  skills: z.array(skillSchema),
});

const talkSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  title: z.string(),
  event: z.string(),
  date: z.string(),
  description: z.string(),
  links: z.string(),
  sortOrder: z.number(),
});

const certificationSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  name: z.string(),
  issuer: z.string(),
  date: z.string(),
  url: z.string(),
  sortOrder: z.number(),
});

const volunteerSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  organization: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  sortOrder: z.number(),
});

const languageSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  name: z.string(),
  proficiency: z.string(),
  sortOrder: z.number(),
});

const jobSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  location: z.string(),
  payRate: z.string(),
  status: jobStatusSchema,
});

export const resumeDetailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  fullName: z.string(),
  headline: z.string(),
  description: z.string(),
  jobDescription: z.string(),
  jobId: z.string().nullable(),
  job: jobSchema.nullable(),
  templateId: z.enum(TEMPLATE_IDS),
  ...timestamps,
  sections: z.array(sectionSchema),
  contacts: z.array(contactSchema),
  links: z.array(linkSchema),
  summaries: z.array(summarySchema),
  notes: z.array(noteSchema),
  experiences: z.array(experienceSchema),
  education: z.array(educationSchema),
  projects: z.array(projectSchema),
  skillGroups: z.array(skillGroupSchema),
  talks: z.array(talkSchema),
  certifications: z.array(certificationSchema),
  volunteers: z.array(volunteerSchema),
  languages: z.array(languageSchema),
});
export class ResumeDetailDto extends createZodDto(resumeDetailSchema) {}
