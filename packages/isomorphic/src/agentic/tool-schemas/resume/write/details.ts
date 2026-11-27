import { z } from "zod";
import { TEMPLATE_IDS } from "../../../../resume/schema.ts";
import { targetResumeShape } from "../shared.ts";
import { idTextSchema, skillGroupViewSchema } from "../view.ts";

export const updateResumeDetailsToolInputSchema = z.object({
  ...targetResumeShape,
  name: z.string().trim().min(1).max(120).optional().describe("Internal name in the résumé list."),
  fullName: z.string().trim().max(200).optional(),
  headline: z.string().trim().max(300).optional(),
  description: z.string().trim().max(800).optional(),
  templateId: z.enum(TEMPLATE_IDS).optional(),
});

export const updateResumeDetailsToolOutputSchema = z.object({
  resumeId: z.string(),
  name: z.string(),
  fullName: z.string(),
  headline: z.string(),
  description: z.string(),
  templateId: z.enum(TEMPLATE_IDS),
});

export const setSummaryToolInputSchema = z.object({
  ...targetResumeShape,
  text: z.string().trim().max(2_000).describe("The new summary. Empty clears it."),
});

export const setSummaryToolOutputSchema = z.object({
  resumeId: z.string(),
  summary: idTextSchema.nullable(),
});

export const setExperienceBulletsToolInputSchema = z.object({
  ...targetResumeShape,
  experienceId: z.string().trim().min(1).describe("Experience id from get_resume."),
  bullets: z
    .array(z.string().trim().min(1).max(600))
    .max(12)
    .describe("Every bullet this experience should show, in order. Unchanged wording is reused."),
});

export const setExperienceBulletsToolOutputSchema = z.object({
  resumeId: z.string(),
  experienceId: z.string(),
  bullets: z.array(idTextSchema),
});

export const setSkillsToolInputSchema = z.object({
  ...targetResumeShape,
  groups: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        skills: z.array(z.string().trim().min(1).max(80)).max(40),
      }),
    )
    .max(12)
    .describe("Replaces every skill group on the résumé, in this order."),
});

export const setSkillsToolOutputSchema = z.object({
  resumeId: z.string(),
  skills: z.array(skillGroupViewSchema),
});

export type UpdateResumeDetailsToolInput = z.input<typeof updateResumeDetailsToolInputSchema>;
export type UpdateResumeDetailsToolOutput = z.infer<typeof updateResumeDetailsToolOutputSchema>;
export type SetSummaryToolInput = z.input<typeof setSummaryToolInputSchema>;
export type SetSummaryToolOutput = z.infer<typeof setSummaryToolOutputSchema>;
export type SetExperienceBulletsToolInput = z.input<typeof setExperienceBulletsToolInputSchema>;
export type SetExperienceBulletsToolOutput = z.infer<typeof setExperienceBulletsToolOutputSchema>;
export type SetSkillsToolInput = z.input<typeof setSkillsToolInputSchema>;
export type SetSkillsToolOutput = z.infer<typeof setSkillsToolOutputSchema>;
