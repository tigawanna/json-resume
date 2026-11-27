import { z } from "zod";
import { resumeDocumentV1Schema } from "../../../resume/schema.ts";
import { resumeViewSchema } from "./view.ts";

export const workbenchTabSchema = z.enum(["edit", "preview", "json", "prompt", "ai"]);

const makeActiveSchema = z
  .boolean()
  .default(true)
  .describe("Make the new résumé the active one so follow-up edits land on it.");

export const cloneResumeToolInputSchema = z.object({
  sourceResumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé to copy. Defaults to the active résumé."),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(800).optional(),
  jobId: z
    .string()
    .trim()
    .optional()
    .describe("Tracked job the copy should target. Omit to keep the source's job."),
  makeActive: makeActiveSchema,
});

export const cloneResumeToolOutputSchema = z.object({
  sourceResumeId: z.string(),
  resumeId: z.string(),
  name: z.string(),
  jobId: z.string().nullable(),
  active: z.boolean(),
});

export const createResumeToolInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(800).optional(),
  jobId: z.string().trim().optional().describe("Tracked job the résumé should target."),
  document: resumeDocumentV1Schema
    .optional()
    .describe(
      "A complete parsed résumé, for importing pasted résumé text. Omit for a blank résumé and fill it with the setters and upserts.",
    ),
  makeActive: makeActiveSchema,
});

export const createResumeToolOutputSchema = z.object({
  resumeId: z.string(),
  name: z.string(),
  active: z.boolean(),
});

export const openResumeToolInputSchema = z.object({
  resumeId: z.string().trim().optional().describe("Defaults to the active résumé."),
  tab: workbenchTabSchema.default("ai").describe('"ai" keeps this conversation in view.'),
});

export const openResumeToolOutputSchema = z.object({
  resumeId: z.string(),
  tab: workbenchTabSchema,
  opensAfterReply: z
    .boolean()
    .describe("The editor switches once this reply finishes; the conversation moves with it."),
});

const rankedResumeSchema = z.object({
  resumeId: z.string(),
  name: z.string(),
  jobId: z.string().nullable(),
  score: z.number().describe("Share of the job's keywords the résumé covers, 0 to 1."),
  matchedTerms: z.array(z.string()),
  missingTerms: z.array(z.string()).describe("Most frequent job keywords the résumé lacks."),
});

export const rankResumesForJobToolInputSchema = z.object({
  jobId: z.string().trim().optional().describe("Tracked job. Defaults to the active résumé's job."),
  jobText: z
    .string()
    .trim()
    .max(40_000)
    .optional()
    .describe("Posting text to rank against when the job is not tracked."),
  limit: z.number().int().min(1).max(20).default(5),
});

export const rankResumesForJobToolOutputSchema = z.object({
  jobId: z.string().nullable(),
  keywords: z.array(z.string()).describe("The job keywords résumés were scored on."),
  results: z.array(rankedResumeSchema),
});

export const tailorResumeForJobToolInputSchema = z.object({
  jobId: z.string().trim().min(1).describe("Tracked job (save it with save_job first)."),
  baseResumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé to start from. Defaults to the best match for the job."),
  name: z.string().trim().min(1).max(120).optional(),
});

export const tailorResumeForJobToolOutputSchema = z.object({
  jobId: z.string(),
  baseResumeId: z.string(),
  resumeId: z.string(),
  name: z.string(),
  score: z.number(),
  missingTerms: z.array(z.string()),
  resume: resumeViewSchema,
});

export type WorkbenchTab = z.infer<typeof workbenchTabSchema>;
export type CloneResumeToolInput = z.input<typeof cloneResumeToolInputSchema>;
export type CloneResumeToolOutput = z.infer<typeof cloneResumeToolOutputSchema>;
export type CreateResumeToolInput = z.input<typeof createResumeToolInputSchema>;
export type CreateResumeToolOutput = z.infer<typeof createResumeToolOutputSchema>;
export type OpenResumeToolInput = z.input<typeof openResumeToolInputSchema>;
export type OpenResumeToolOutput = z.infer<typeof openResumeToolOutputSchema>;
export type RankedResume = z.infer<typeof rankedResumeSchema>;
export type RankResumesForJobToolInput = z.input<typeof rankResumesForJobToolInputSchema>;
export type RankResumesForJobToolOutput = z.infer<typeof rankResumesForJobToolOutputSchema>;
export type TailorResumeForJobToolInput = z.input<typeof tailorResumeForJobToolInputSchema>;
export type TailorResumeForJobToolOutput = z.infer<typeof tailorResumeForJobToolOutputSchema>;
