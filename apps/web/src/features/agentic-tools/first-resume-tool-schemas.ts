import { z } from "zod";
import { resumeDocumentV1Schema } from "@/features/resume/resume-schema";

export const startFirstResumeToolInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .describe('Short name for the new résumé, e.g. "Alex Chen" or "Software engineer CV".'),
  document: resumeDocumentV1Schema
    .optional()
    .describe(
      "Parsed résumé when the user pasted one, or a skeleton with only facts from ask_user. Omit for a blank shell.",
    ),
  jobId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Tracked job to attach when they also pasted a posting. Save it with save_job first."),
  reason: z
    .string()
    .trim()
    .min(1)
    .max(600)
    .describe("What you collected (paste vs answers) so the editor's assistant has the intake."),
  suggestedPrompt: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .describe(
      "First instruction for the editor's assistant: restates the intake and tells it to fill this résumé, then ask_user for anything still missing.",
    ),
});

export const startFirstResumeToolOutputSchema = z.object({
  resumeId: z.string(),
  name: z.string(),
  jobId: z.string().nullable(),
  jobAttached: z.boolean(),
  imported: z.boolean().describe("True when a document was stored on create."),
  opensAfterReply: z.literal(true),
});

export type StartFirstResumeToolInput = z.input<typeof startFirstResumeToolInputSchema>;
export type StartFirstResumeToolOutput = z.infer<typeof startFirstResumeToolOutputSchema>;
