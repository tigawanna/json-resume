import { z } from "zod";
import { searchPageInputShape, searchPageOutputShape } from "./resume-tool-schemas";

const coverLetterBodySchema = z.string().trim().min(1).max(20_000);

export const coverLetterRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  resumeId: z.string().nullable().describe("Résumé the letter goes with."),
  jobId: z.string().nullable().describe("Tracked job the letter targets."),
  wordCount: z.number().int(),
  preview: z.string(),
  updatedAt: z.string(),
});

export const coverLetterDetailSchema = coverLetterRowSchema
  .omit({ preview: true })
  .extend({ body: z.string().describe("The letter in markdown.") });

export const saveCoverLetterToolInputSchema = z.object({
  coverLetterId: z
    .string()
    .trim()
    .optional()
    .describe("Letter to change. Omit to create a new one."),
  title: z
    .string()
    .trim()
    .max(160)
    .optional()
    .describe('Short label such as "Acme — Senior Engineer". Defaults to the job or résumé name.'),
  body: coverLetterBodySchema
    .optional()
    .describe(
      "The whole letter in markdown: greeting, a few short paragraphs, sign-off with the user's name. Replaces the stored text. Required when creating.",
    ),
  resumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé the letter goes with. Defaults to the active résumé when creating."),
  jobId: z
    .string()
    .trim()
    .optional()
    .describe("Tracked job it targets. Defaults to that résumé's job when creating."),
});

export const saveCoverLetterToolOutputSchema = z.object({
  coverLetter: coverLetterRowSchema,
  created: z.boolean(),
});

export const getCoverLetterToolInputSchema = z.object({
  coverLetterId: z
    .string()
    .trim()
    .optional()
    .describe("Omit to read the newest letter written for a résumé."),
  resumeId: z
    .string()
    .trim()
    .optional()
    .describe(
      "Résumé whose newest letter to read when coverLetterId is omitted. Defaults to the active résumé.",
    ),
});

export const getCoverLetterToolOutputSchema = z.object({ coverLetter: coverLetterDetailSchema });

export const listCoverLettersToolInputSchema = z.object({
  ...searchPageInputShape,
  resumeId: z.string().trim().optional().describe("Only letters written for this résumé."),
});

export const listCoverLettersToolOutputSchema = z.object({
  coverLetters: z.array(coverLetterRowSchema),
  ...searchPageOutputShape,
});

export type CoverLetterRow = z.infer<typeof coverLetterRowSchema>;
export type CoverLetterDetail = z.infer<typeof coverLetterDetailSchema>;
export type SaveCoverLetterToolInput = z.input<typeof saveCoverLetterToolInputSchema>;
export type SaveCoverLetterToolOutput = z.infer<typeof saveCoverLetterToolOutputSchema>;
export type GetCoverLetterToolInput = z.input<typeof getCoverLetterToolInputSchema>;
export type GetCoverLetterToolOutput = z.infer<typeof getCoverLetterToolOutputSchema>;
export type ListCoverLettersToolInput = z.input<typeof listCoverLettersToolInputSchema>;
export type ListCoverLettersToolOutput = z.infer<typeof listCoverLettersToolOutputSchema>;
