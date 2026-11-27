import { z } from "zod";
import { resumeDocumentV1Schema } from "../../../../resume/schema.ts";
import { targetResumeShape } from "../shared.ts";
import {
  educationViewSchema,
  experienceViewSchema,
  projectViewSchema,
  talkViewSchema,
} from "../view.ts";

export const removableSectionSchema = z.enum([
  "summary",
  "experience",
  "education",
  "projects",
  "talks",
  "skills",
  "notes",
  "contacts",
  "links",
]);

export const removeFromResumeToolInputSchema = z.object({
  ...targetResumeShape,
  section: removableSectionSchema,
  itemId: z
    .string()
    .trim()
    .min(1)
    .describe("Item id from get_resume (a skill group id for skills). The library row is kept."),
});

const upsertIdShape = {
  id: z
    .string()
    .trim()
    .optional()
    .describe(
      "Library id to edit (from get_resume or search). Omit to create; an identical existing item is reused.",
    ),
};

const shortText = z.string().trim().max(200);

export const upsertExperienceToolInputSchema = z.object({
  ...targetResumeShape,
  ...upsertIdShape,
  company: shortText.optional().describe("Required when creating."),
  role: shortText.optional().describe("Required when creating."),
  startDate: z.string().trim().max(40).optional(),
  endDate: z.string().trim().max(40).optional().describe('Empty or "Present" for a current role.'),
  location: shortText.optional(),
  bullets: z
    .array(z.string().trim().min(1).max(600))
    .max(12)
    .optional()
    .describe("When given, the bullets this experience shows on the résumé, in order."),
});

export const upsertProjectToolInputSchema = z.object({
  ...targetResumeShape,
  ...upsertIdShape,
  name: shortText.optional().describe("Required when creating."),
  description: z.string().trim().max(2_000).optional(),
  tech: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  url: z.string().trim().max(2_000).optional(),
  homepageUrl: z.string().trim().max(2_000).optional(),
});

export const upsertEducationToolInputSchema = z.object({
  ...targetResumeShape,
  ...upsertIdShape,
  school: shortText.optional().describe("Required when creating."),
  degree: shortText.optional(),
  field: shortText.optional(),
  startDate: z.string().trim().max(40).optional(),
  endDate: z.string().trim().max(40).optional(),
  description: z.string().trim().max(2_000).optional(),
});

export const upsertTalkToolInputSchema = z.object({
  ...targetResumeShape,
  ...upsertIdShape,
  title: shortText.optional().describe("Required when creating."),
  event: shortText.optional(),
  date: z.string().trim().max(40).optional(),
  description: z.string().trim().max(2_000).optional(),
  links: z
    .array(z.object({ label: shortText, url: z.string().trim().max(2_000) }))
    .max(10)
    .optional(),
});

const upsertOutputShape = {
  resumeId: z.string(),
  created: z.boolean().describe("True when a new library item was inserted."),
};

export const upsertExperienceToolOutputSchema = z.object({
  ...upsertOutputShape,
  experience: experienceViewSchema,
});
export const upsertProjectToolOutputSchema = z.object({
  ...upsertOutputShape,
  project: projectViewSchema,
});
export const upsertEducationToolOutputSchema = z.object({
  ...upsertOutputShape,
  education: educationViewSchema,
});
export const upsertTalkToolOutputSchema = z.object({ ...upsertOutputShape, talk: talkViewSchema });

export const replaceResumeDocumentToolInputSchema = z.object({
  ...targetResumeShape,
  document: resumeDocumentV1Schema,
});

export const removeFromResumeToolOutputSchema = z.object({
  resumeId: z.string(),
  section: removableSectionSchema,
  itemId: z.string(),
  removed: z.boolean().describe("False when the item was not on the résumé."),
});

export type RemovableSection = z.infer<typeof removableSectionSchema>;
export type RemoveFromResumeToolInput = z.input<typeof removeFromResumeToolInputSchema>;
export type RemoveFromResumeToolOutput = z.infer<typeof removeFromResumeToolOutputSchema>;
export type UpsertExperienceToolInput = z.input<typeof upsertExperienceToolInputSchema>;
export type UpsertExperienceToolOutput = z.infer<typeof upsertExperienceToolOutputSchema>;
export type UpsertProjectToolInput = z.input<typeof upsertProjectToolInputSchema>;
export type UpsertProjectToolOutput = z.infer<typeof upsertProjectToolOutputSchema>;
export type UpsertEducationToolInput = z.input<typeof upsertEducationToolInputSchema>;
export type UpsertEducationToolOutput = z.infer<typeof upsertEducationToolOutputSchema>;
export type UpsertTalkToolInput = z.input<typeof upsertTalkToolInputSchema>;
export type UpsertTalkToolOutput = z.infer<typeof upsertTalkToolOutputSchema>;
export type ReplaceResumeDocumentToolInput = z.input<typeof replaceResumeDocumentToolInputSchema>;
