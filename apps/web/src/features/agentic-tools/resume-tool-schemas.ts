import { resumeDocumentV1Schema } from "@/features/resume/resume-schema";
import { z } from "zod";

export const resumeBlockTypeSchema = z.enum([
  "summary",
  "experience",
  "experience_bullet",
  "project",
  "skill",
]);

export const listResumesToolInputSchema = z.object({
  keyword: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const getResumeDocumentToolInputSchema = z.object({
  resumeId: z.string().trim().min(1),
});

export const searchResumeBlocksToolInputSchema = z.object({
  resumeId: z.string().trim().min(1).optional(),
  keyword: z.string().trim().min(1).optional(),
  blockTypes: z.array(resumeBlockTypeSchema).min(1).optional(),
  limitPerType: z.coerce.number().int().min(1).max(20).default(8),
});

export const addExperienceBulletToolInputSchema = z.object({
  experienceId: z.string().trim().min(1),
  text: z.string().trim().min(1).max(600),
  afterBulletId: z.string().trim().min(1).optional(),
});

export const replaceExperienceBulletsToolInputSchema = z.object({
  experienceId: z.string().trim().min(1),
  bullets: z.array(z.string().trim().min(1).max(600)).min(1).max(12),
});

export const createResumeFromDocumentToolInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(800).default(""),
  jobDescription: z.string().trim().max(20_000).default(""),
  document: resumeDocumentV1Schema,
});

export type ResumeBlockType = z.infer<typeof resumeBlockTypeSchema>;
export type ListResumesToolInput = z.infer<typeof listResumesToolInputSchema>;
export type GetResumeDocumentToolInput = z.infer<typeof getResumeDocumentToolInputSchema>;
export type SearchResumeBlocksToolInput = z.infer<typeof searchResumeBlocksToolInputSchema>;
export type AddExperienceBulletToolInput = z.infer<typeof addExperienceBulletToolInputSchema>;
export type ReplaceExperienceBulletsToolInput = z.infer<
  typeof replaceExperienceBulletsToolInputSchema
>;
export type CreateResumeFromDocumentToolInput = z.infer<
  typeof createResumeFromDocumentToolInputSchema
>;
