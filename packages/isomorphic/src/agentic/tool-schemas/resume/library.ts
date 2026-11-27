import { z } from "zod";
import { searchPageInputShape, searchPageOutputShape } from "../search-page.ts";
import { targetResumeShape } from "./shared.ts";

export const librarySectionSchema = z.enum([
  "summary",
  "experience",
  "experience_bullet",
  "education",
  "projects",
  "talks",
  "skills",
]);

export const libraryHitSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  experienceId: z
    .string()
    .nullable()
    .describe("For experience_bullet: the experience it belongs to."),
  onResume: z.boolean().describe("Already shown on the target résumé."),
});

export const searchLibraryToolInputSchema = z.object({
  section: librarySectionSchema.describe("One library section per call."),
  ...searchPageInputShape,
  resumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé used for onResume. Defaults to the active résumé in the app."),
  notOnResume: z
    .boolean()
    .default(false)
    .describe("Only return items the target résumé does not show yet."),
});

export const searchLibraryToolOutputSchema = z.object({
  section: librarySectionSchema,
  resumeId: z.string().nullable(),
  items: z.array(libraryHitSchema),
  ...searchPageOutputShape,
});

export const attachableSectionSchema = z.enum([
  "experience",
  "experience_bullet",
  "education",
  "projects",
  "talks",
]);

export const attachLibraryItemsToolInputSchema = z.object({
  ...targetResumeShape,
  section: attachableSectionSchema,
  ids: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(30)
    .describe(
      "Library ids from search_library. Experiences arrive with all their bullets; a bullet joins its experience.",
    ),
});

export const attachLibraryItemsToolOutputSchema = z.object({
  resumeId: z.string(),
  section: attachableSectionSchema,
  attachedIds: z.array(z.string()),
  alreadyOnResume: z.array(z.string()),
});

export const rankedLibraryItemSchema = libraryHitSchema.extend({
  section: librarySectionSchema,
  score: z.number().int().describe("How many job keywords the item mentions."),
  matchedTerms: z.array(z.string()),
});

export const rankLibraryForJobToolInputSchema = z.object({
  jobId: z.string().trim().optional().describe("Tracked job. Defaults to the active résumé's job."),
  jobText: z.string().trim().max(20_000).optional().describe("Posting text, instead of jobId."),
  resumeId: z
    .string()
    .trim()
    .optional()
    .describe("Résumé to fill. Defaults to the active résumé in the app."),
  sections: z.array(librarySectionSchema).min(1).optional().describe("Defaults to every section."),
  includeOnResume: z.boolean().default(false),
  limit: z.number().int().min(1).max(30).default(10),
});

export const rankLibraryForJobToolOutputSchema = z.object({
  jobId: z.string().nullable(),
  resumeId: z.string().nullable(),
  keywords: z.array(z.string()),
  results: z.array(rankedLibraryItemSchema),
});

export const reorderableSectionSchema = z.enum([
  "experience",
  "education",
  "projects",
  "talks",
  "skills",
  "contacts",
  "links",
]);

export const reorderSectionToolInputSchema = z.object({
  ...targetResumeShape,
  section: reorderableSectionSchema,
  ids: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(60)
    .describe(
      "Item ids from get_resume in the new order (skill group ids for skills). Unlisted items keep their order after these.",
    ),
});

export const reorderSectionToolOutputSchema = z.object({
  resumeId: z.string(),
  section: reorderableSectionSchema,
  ids: z.array(z.string()),
});

export type LibrarySection = z.infer<typeof librarySectionSchema>;
export type LibraryHit = z.infer<typeof libraryHitSchema>;
export type SearchLibraryToolInput = z.input<typeof searchLibraryToolInputSchema>;
export type SearchLibraryToolOutput = z.infer<typeof searchLibraryToolOutputSchema>;
export type AttachableSection = z.infer<typeof attachableSectionSchema>;
export type AttachLibraryItemsToolInput = z.input<typeof attachLibraryItemsToolInputSchema>;
export type AttachLibraryItemsToolOutput = z.infer<typeof attachLibraryItemsToolOutputSchema>;
export type RankedLibraryItem = z.infer<typeof rankedLibraryItemSchema>;
export type RankLibraryForJobToolInput = z.input<typeof rankLibraryForJobToolInputSchema>;
export type RankLibraryForJobToolOutput = z.infer<typeof rankLibraryForJobToolOutputSchema>;
export type ReorderableSection = z.infer<typeof reorderableSectionSchema>;
export type ReorderSectionToolInput = z.input<typeof reorderSectionToolInputSchema>;
export type ReorderSectionToolOutput = z.infer<typeof reorderSectionToolOutputSchema>;
