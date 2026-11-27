import { z } from "zod";

export const startResumeModeSchema = z.enum(["reuse", "copy"]);

export const startResumeForJobToolInputSchema = z.object({
  jobId: z
    .string()
    .trim()
    .min(1)
    .describe("Tracked job the résumé is for (save it with save_job first)."),
  resumeId: z
    .string()
    .trim()
    .min(1)
    .describe('With "reuse", the résumé to open as it is. With "copy", the résumé to copy from.'),
  mode: startResumeModeSchema.describe(
    '"reuse" when the résumé already fits the job and needs no new draft; "copy" for a new draft based on it.',
  ),
  reason: z
    .string()
    .trim()
    .min(1)
    .max(600)
    .describe(
      "One or two sentences for the approval card: why this résumé, and why reuse or copy it.",
    ),
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional()
    .describe('Name for the copy. Defaults to "<résumé> for <job>". Ignored with "reuse".'),
  suggestedPrompt: z
    .string()
    .trim()
    .min(1)
    .max(600)
    .describe(
      "The first instruction for the résumé editor's assistant, written as the user would type it, e.g. \"Tailor the summary and bullets to this job and cover the missing keywords: Kafka, gRPC.\" It is put in the editor's composer for the user to send.",
    ),
});

export const startResumeForJobToolOutputSchema = z.object({
  resumeId: z.string(),
  name: z.string(),
  mode: startResumeModeSchema,
  baseResumeId: z.string().describe("The résumé that was reused or copied."),
  jobId: z.string(),
  jobAttached: z
    .boolean()
    .describe(
      "False when a reused résumé already targets another job and was left pointing at it.",
    ),
  opensAfterReply: z.literal(true),
});

export type StartResumeForJobToolInput = z.input<typeof startResumeForJobToolInputSchema>;
export type StartResumeForJobToolOutput = z.infer<typeof startResumeForJobToolOutputSchema>;
