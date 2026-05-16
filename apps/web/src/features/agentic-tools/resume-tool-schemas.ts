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
  keyword: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const getResumeDocumentToolInputSchema = z.object({
  resumeId: z.string().trim().min(1),
});

export const searchResumeBlocksToolInputSchema = z.object({
  resumeId: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().min(1).optional(),
  ),
  keyword: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().optional(),
  ),
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

export const cloneResumeToolInputSchema = z.object({
  sourceResumeId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(800).optional(),
  jobDescription: z.string().trim().max(20_000).optional(),
});

export const cloneCurrentResumeToolInputSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(800).optional(),
  jobDescription: z.string().trim().max(20_000).optional(),
});

export const updateCurrentResumeDocumentToolInputSchema = z.object({
  document: resumeDocumentV1Schema,
});

export const updateResumeDocumentToolInputSchema = z.object({
  resumeId: z.string().trim().min(1),
  document: resumeDocumentV1Schema,
});

export const updateResumeDocumentToolOutputSchema = z.object({
  resumeId: z.string(),
  updatedAt: z.string(),
});

export const refreshResumePreviewToolInputSchema = z.object({
  reason: z.string().trim().max(240).optional(),
});

export const navigateToResumeToolInputSchema = z.object({
  resumeId: z.string().trim().min(1),
  tab: z.enum(["edit", "preview", "json", "prompt", "ai"]).default("preview"),
  reason: z.string().trim().max(240).optional(),
});

export const resumeListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string(),
  headline: z.string(),
  description: z.string(),
  templateId: z.string(),
  updatedAt: z.string(),
});

export const listResumesToolOutputSchema = z.object({
  resumes: z.array(resumeListItemSchema),
});

export const getResumeDocumentToolOutputSchema = z.object({
  resume: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    jobDescription: z.string(),
    document: resumeDocumentV1Schema,
    updatedAt: z.string(),
  }),
});

export const resumeSearchBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("summary"),
    id: z.string(),
    resumeId: z.string(),
    resumeName: z.string(),
    text: z.string(),
  }),
  z.object({
    type: z.literal("experience"),
    id: z.string(),
    resumeId: z.string(),
    resumeName: z.string(),
    company: z.string(),
    role: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    location: z.string(),
  }),
  z.object({
    type: z.literal("experience_bullet"),
    id: z.string(),
    experienceId: z.string(),
    resumeId: z.string(),
    resumeName: z.string(),
    company: z.string(),
    role: z.string(),
    text: z.string(),
    sortOrder: z.number().int(),
  }),
  z.object({
    type: z.literal("project"),
    id: z.string(),
    resumeId: z.string(),
    resumeName: z.string(),
    name: z.string(),
    description: z.string(),
    tech: z.array(z.string()),
    url: z.string(),
    homepageUrl: z.string(),
  }),
  z.object({
    type: z.literal("skill"),
    id: z.string(),
    groupId: z.string(),
    resumeId: z.string(),
    resumeName: z.string(),
    groupName: z.string(),
    name: z.string(),
  }),
]);

export const searchResumeBlocksToolOutputSchema = z.object({
  blocks: z.array(resumeSearchBlockSchema),
});

export const addExperienceBulletToolOutputSchema = z.object({
  bullet: z.object({
    id: z.string(),
    experienceId: z.string(),
    text: z.string(),
    sortOrder: z.number().int(),
  }),
});

export const replaceExperienceBulletsToolOutputSchema = z.object({
  experienceId: z.string(),
  bulletCount: z.number().int(),
});

export const createResumeFromDocumentToolOutputSchema = z.object({
  resumeId: z.string(),
  name: z.string(),
});

export const cloneResumeToolOutputSchema = z.object({
  sourceResumeId: z.string(),
  resumeId: z.string(),
  name: z.string(),
});

export const refreshResumePreviewToolOutputSchema = z.object({
  refreshed: z.boolean(),
  resumeId: z.string(),
});

export const navigateToResumeToolOutputSchema = z.object({
  navigated: z.boolean(),
  resumeId: z.string(),
  tab: z.enum(["edit", "preview", "json", "prompt", "ai"]),
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
export type CloneResumeToolInput = z.infer<typeof cloneResumeToolInputSchema>;
export type ListResumesToolOutput = z.infer<typeof listResumesToolOutputSchema>;
export type GetResumeDocumentToolOutput = z.infer<typeof getResumeDocumentToolOutputSchema>;
export type ResumeSearchBlockSchema = z.infer<typeof resumeSearchBlockSchema>;
export type SearchResumeBlocksToolOutput = z.infer<typeof searchResumeBlocksToolOutputSchema>;
export type AddExperienceBulletToolOutput = z.infer<typeof addExperienceBulletToolOutputSchema>;
export type ReplaceExperienceBulletsToolOutput = z.infer<
  typeof replaceExperienceBulletsToolOutputSchema
>;
export type CreateResumeFromDocumentToolOutput = z.infer<
  typeof createResumeFromDocumentToolOutputSchema
>;
export type CloneResumeToolOutput = z.infer<typeof cloneResumeToolOutputSchema>;
export type UpdateCurrentResumeDocumentToolInput = z.infer<
  typeof updateCurrentResumeDocumentToolInputSchema
>;
export type UpdateResumeDocumentToolInput = z.infer<typeof updateResumeDocumentToolInputSchema>;
export type UpdateResumeDocumentToolOutput = z.infer<typeof updateResumeDocumentToolOutputSchema>;
