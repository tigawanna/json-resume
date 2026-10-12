import { z } from "zod";
import { searchPageInputShape, searchPageOutputShape } from "./resume-tool-schemas";

export const applicationAnswerRowSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string().describe("Plain text. [[...]] marks a detail the user still has to fill in."),
  resumeId: z.string().nullable().describe("Résumé the answer was written with."),
  jobId: z.string().nullable().describe("Tracked job whose application asked the question."),
  jobLabel: z.string().nullable().describe('That job as "Company — Title".'),
  wordCount: z.number().int(),
  placeholders: z.number().int().describe("How many [[...]] gaps are still open."),
  updatedAt: z.string(),
});

const answerItemSchema = z.object({
  answerId: z
    .string()
    .trim()
    .optional()
    .describe("Saved answer to revise. Omit to add a new question."),
  question: z
    .string()
    .trim()
    .min(1)
    .max(2_000)
    .optional()
    .describe("The question exactly as the form asks it. Required for new questions."),
  answer: z
    .string()
    .trim()
    .max(8_000)
    .optional()
    .describe(
      "Plain text, no markdown, ready to paste into a form field. Put [[short hint]] where only the user knows the detail, e.g. [[the latency before and after]]. Replaces the stored answer.",
    ),
});

export const saveApplicationAnswersToolInputSchema = z.object({
  answers: z
    .array(answerItemSchema)
    .min(1)
    .max(25)
    .describe("Every question from the application, in the order the form asks them."),
  resumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé the answers draw on. Defaults to the active résumé for new questions."),
  jobId: z
    .string()
    .trim()
    .optional()
    .describe("Tracked job whose application asks these. Defaults to that résumé's job."),
});

export const saveApplicationAnswersToolOutputSchema = z.object({
  answers: z.array(applicationAnswerRowSchema),
  created: z.number().int(),
  updated: z.number().int(),
});

export const searchApplicationAnswersToolInputSchema = z.object({
  ...searchPageInputShape,
  answerIds: z
    .array(z.string().trim().min(1))
    .max(25)
    .optional()
    .describe("Read exactly these answers, e.g. the referenced ones. Other filters are ignored."),
  jobId: z.string().trim().optional().describe("Only answers for this job's application."),
  resumeId: z.string().trim().optional().describe("Only answers written with this résumé."),
});

export const searchApplicationAnswersToolOutputSchema = z.object({
  answers: z.array(applicationAnswerRowSchema),
  ...searchPageOutputShape,
});

export type ApplicationAnswerRow = z.infer<typeof applicationAnswerRowSchema>;
export type SaveApplicationAnswersToolInput = z.input<typeof saveApplicationAnswersToolInputSchema>;
export type SaveApplicationAnswersToolOutput = z.infer<
  typeof saveApplicationAnswersToolOutputSchema
>;
export type SearchApplicationAnswersToolInput = z.input<
  typeof searchApplicationAnswersToolInputSchema
>;
export type SearchApplicationAnswersToolOutput = z.infer<
  typeof searchApplicationAnswersToolOutputSchema
>;
