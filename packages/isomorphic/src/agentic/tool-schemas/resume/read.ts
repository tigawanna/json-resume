import { z } from "zod";
import { searchPageInputShape, searchPageOutputShape } from "../search-page.ts";
import { resumeViewSectionSchema } from "./view.ts";

export const listResumesToolInputSchema = z.object(searchPageInputShape);

export const setActiveResumeToolInputSchema = z.object({
  resumeId: z.string().trim().min(1),
});

export const setActiveResumeToolOutputSchema = z.object({
  resumeId: z.string(),
  name: z.string(),
});

export const replaceResumeDocumentToolOutputSchema = z.object({
  resumeId: z.string(),
  updatedAt: z.string(),
});

export const resumeListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string(),
  headline: z.string(),
  description: z.string(),
  templateId: z.string(),
  jobId: z.string().nullable(),
  jobLabel: z.string().describe("Company and title of the target job, or empty when none."),
  updatedAt: z.string(),
});

export const listResumesToolOutputSchema = z.object({
  resumes: z.array(resumeListItemSchema),
  ...searchPageOutputShape,
});

export const getResumeToolInputSchema = z.object({
  resumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé to read. Defaults to the active résumé in the app."),
  sections: z
    .array(resumeViewSectionSchema)
    .min(1)
    .optional()
    .describe(
      'Only return these sections to keep the payload small. "job" adds the linked job description. Omit for everything.',
    ),
});

export type ListResumesToolInput = z.input<typeof listResumesToolInputSchema>;
export type GetResumeToolInput = z.input<typeof getResumeToolInputSchema>;
export type SetActiveResumeToolInput = z.input<typeof setActiveResumeToolInputSchema>;
export type SetActiveResumeToolOutput = z.infer<typeof setActiveResumeToolOutputSchema>;
export type ListResumesToolOutput = z.infer<typeof listResumesToolOutputSchema>;
export type ReplaceResumeDocumentToolOutput = z.infer<typeof replaceResumeDocumentToolOutputSchema>;
