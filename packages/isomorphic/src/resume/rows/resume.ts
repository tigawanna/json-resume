import { z } from "zod";
import { resumeLayoutSchema } from "../layout/schema.ts";
import { embeddableSchema, timestampsSchema } from "./shared.ts";

export const resumeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  fullName: z.string(),
  headline: z.string(),
  description: z.string(),
  jobId: z.string().nullable().optional(),
  templateId: z.string(),
  layout: resumeLayoutSchema.nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type Resume = z.infer<typeof resumeSchema>;

export const resumeExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeExperience = z.infer<typeof resumeExperienceSchema>;

export const resumeExperienceBulletSchema = z.object({
  id: z.string(),
  experienceId: z.string(),
  text: z.string(),
  sortOrder: z.number(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeExperienceBullet = z.infer<typeof resumeExperienceBulletSchema>;

export const resumeEducationSchema = z.object({
  id: z.string(),
  school: z.string(),
  degree: z.string(),
  field: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeEducation = z.infer<typeof resumeEducationSchema>;

export const resumeEducationBulletSchema = z.object({
  id: z.string(),
  educationId: z.string(),
  text: z.string(),
  sortOrder: z.number(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeEducationBullet = z.infer<typeof resumeEducationBulletSchema>;

export const resumeSkillGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  userId: z.string().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeSkillGroup = z.infer<typeof resumeSkillGroupSchema>;

export const resumeSkillSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  name: z.string(),
  level: z.string().nullable().optional(),
  sortOrder: z.number(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type ResumeSkill = z.infer<typeof resumeSkillSchema>;

export const JOB_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "archived",
] as const;
export const jobStatusSchema = z.enum(JOB_STATUSES);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const jobSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  company: z.string(),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  location: z.string(),
  payRate: z.string().default(""),
  hourlyMinCents: z.number().nullable().default(null),
  hourlyMaxCents: z.number().nullable().default(null),
  payBasis: z.string().nullable().default(null),
  status: jobStatusSchema,
  notes: z.string(),
  appliedAt: z.number().nullable().optional(),
  ...embeddableSchema.shape,
  ...timestampsSchema.shape,
});
export type Job = z.infer<typeof jobSchema>;
