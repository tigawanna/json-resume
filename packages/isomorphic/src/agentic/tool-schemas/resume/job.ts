import { z } from "zod";
import { searchPageInputShape, searchPageOutputShape } from "../search-page.ts";
import { targetResumeShape } from "./shared.ts";

export const jobStatusToolSchema = z.enum([
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "archived",
]);

const jobFieldsShape = {
  company: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  url: z.string().trim().max(2_000).optional(),
  location: z.string().trim().max(200).optional(),
  payRate: z
    .string()
    .trim()
    .max(200)
    .optional()
    .describe(
      "Exact pay text from quote_pay_rate source, copied unchanged. Omit when that source is empty. Do not pass an hourly figure you calculated.",
    ),
  status: jobStatusToolSchema.optional(),
  notes: z.string().trim().max(4_000).optional(),
};

const jobDescriptionSchema = z.string().trim().min(1).max(40_000);

export const jobRowSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string(),
  payRate: z.string(),
  hourlyMinCents: z.number().nullable(),
  hourlyMaxCents: z.number().nullable(),
  payBasis: z.string().nullable(),
  status: jobStatusToolSchema,
  url: z.string(),
  notes: z.string(),
  descriptionPreview: z.string(),
  linkedResumeIds: z.array(z.string()).describe("Résumés that target this job."),
  updatedAt: z.string(),
});

export const jobDetailSchema = jobRowSchema
  .omit({ descriptionPreview: true })
  .extend({ description: z.string() });

export const quotePayRateToolInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1)
    .max(40_000)
    .describe("The posting, or the pay line copied from it."),
});

export const quotePayRateToolOutputSchema = z.object({
  source: z
    .string()
    .describe(
      "Exact pay text used. Empty when none was found. Pass this unchanged as save_job payRate.",
    ),
  basis: z
    .string()
    .describe("Hours and exchange rate used. Show this if the user asks how the rate was read."),
  hourlyMinCents: z.number().int().nullable(),
  hourlyMaxCents: z.number().int().nullable(),
});

export const saveJobToolInputSchema = z.object({
  description: jobDescriptionSchema.describe("The full posting text."),
  ...jobFieldsShape,
  attachToResumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé that should target this job. Omit to only save it to the tracker."),
});

export const saveJobToolOutputSchema = z.object({
  job: jobRowSchema,
  created: z.boolean().describe("False when a job with the same posting text was updated."),
  attachedToResumeId: z.string().nullable(),
});

export const updateJobToolInputSchema = z.object({
  jobId: z.string().trim().min(1),
  description: jobDescriptionSchema.optional(),
  ...jobFieldsShape,
});

export const updateJobToolOutputSchema = z.object({ job: jobRowSchema });

export const getJobToolInputSchema = z.object({
  jobId: z.string().trim().optional().describe("Omit to read the job a résumé targets."),
  resumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé whose job to read when jobId is omitted. Defaults to the active résumé."),
});

export const getJobToolOutputSchema = z.object({ job: jobDetailSchema });

export const listJobsToolInputSchema = z.object({
  ...searchPageInputShape,
  status: jobStatusToolSchema.optional(),
});

export const listJobsToolOutputSchema = z.object({
  jobs: z.array(jobRowSchema),
  ...searchPageOutputShape,
});

export const attachJobToolInputSchema = z.object({
  ...targetResumeShape,
  jobId: z.string().trim().min(1).nullable().describe("Job to target, or null to detach."),
});

export const attachJobToolOutputSchema = z.object({
  resumeId: z.string(),
  job: jobRowSchema.nullable(),
});

export type JobStatusTool = z.infer<typeof jobStatusToolSchema>;
export type JobRow = z.infer<typeof jobRowSchema>;
export type JobDetail = z.infer<typeof jobDetailSchema>;
export type SaveJobToolInput = z.input<typeof saveJobToolInputSchema>;
export type SaveJobToolOutput = z.infer<typeof saveJobToolOutputSchema>;
export type UpdateJobToolInput = z.input<typeof updateJobToolInputSchema>;
export type UpdateJobToolOutput = z.infer<typeof updateJobToolOutputSchema>;
export type GetJobToolInput = z.input<typeof getJobToolInputSchema>;
export type GetJobToolOutput = z.infer<typeof getJobToolOutputSchema>;
export type ListJobsToolInput = z.input<typeof listJobsToolInputSchema>;
export type ListJobsToolOutput = z.infer<typeof listJobsToolOutputSchema>;
export type AttachJobToolInput = z.input<typeof attachJobToolInputSchema>;
export type AttachJobToolOutput = z.infer<typeof attachJobToolOutputSchema>;
