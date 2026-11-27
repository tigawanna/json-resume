import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

const experienceIdSchema = z.string().trim().min(1);
const bulletIdSchema = z.string().trim().min(1);

export const listExperienceTitlesToolInputSchema = z.object({});
export const listExperienceTitlesToolOutputSchema = z.object({
  titles: z.array(
    z.object({
      id: z.string(),
      role: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      location: z.string(),
      bulletCount: z.number(),
    }),
  ),
});

export const listExperienceBulletsToolInputSchema = z.object({
  experienceId: experienceIdSchema,
});
export const listExperienceBulletsToolOutputSchema = z.object({
  experienceId: z.string(),
  role: z.string(),
  bullets: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      sortOrder: z.number(),
    }),
  ),
});

export const updateExperienceBulletToolInputSchema = z.object({
  bulletId: bulletIdSchema,
  text: z.string().trim().min(1),
});
export const updateExperienceBulletToolOutputSchema = z.object({
  bulletId: z.string(),
  text: z.string(),
});

export const moveExperienceBulletToolInputSchema = z.object({
  bulletId: bulletIdSchema,
  toExperienceId: experienceIdSchema,
});
export const moveExperienceBulletToolOutputSchema = z.object({
  bulletId: z.string(),
  experienceId: z.string(),
});

export const deleteExperienceBulletToolInputSchema = z.object({
  bulletId: bulletIdSchema,
});
export const deleteExperienceBulletToolOutputSchema = z.object({
  bulletId: z.string(),
  deleted: z.boolean(),
});

export const setTitleBulletsToolInputSchema = z.object({
  experienceId: experienceIdSchema,
  texts: z.array(z.string()),
});
export const setTitleBulletsToolOutputSchema = z.object({
  experienceId: z.string(),
  bulletIds: z.array(z.string()),
});

export const listExperienceTitlesToolDefinition = toolDefinition({
  name: "list_experience_titles",
  description:
    "List the titles saved for this conversation's company and period, with their ids and bullet counts.",
  inputSchema: listExperienceTitlesToolInputSchema,
  outputSchema: listExperienceTitlesToolOutputSchema,
});

export const listExperienceBulletsToolDefinition = toolDefinition({
  name: "list_experience_bullets",
  description:
    "List one title's bullets with their stable ids and order. The system prompt already has a snapshot; re-read only to see the latest state after edits.",
  inputSchema: listExperienceBulletsToolInputSchema,
  outputSchema: listExperienceBulletsToolOutputSchema,
});

export const updateExperienceBulletToolDefinition = toolDefinition({
  name: "update_experience_bullet",
  description:
    "Rewrite one bullet's wording in place. The bullet keeps its id, so every resume showing it updates.",
  inputSchema: updateExperienceBulletToolInputSchema,
  outputSchema: updateExperienceBulletToolOutputSchema,
});

export const moveExperienceBulletToolDefinition = toolDefinition({
  name: "move_experience_bullet",
  description:
    "Reassign a bullet to another title of this same period, appended last. Use it to reuse a bullet under the title it fits best.",
  inputSchema: moveExperienceBulletToolInputSchema,
  outputSchema: moveExperienceBulletToolOutputSchema,
});

export const deleteExperienceBulletToolDefinition = toolDefinition({
  name: "delete_experience_bullet",
  description:
    "Delete one bullet everywhere, including resumes that show it. Delete only weak or fully duplicated wording; merge unique facts into a stronger bullet first.",
  inputSchema: deleteExperienceBulletToolInputSchema,
  outputSchema: deleteExperienceBulletToolOutputSchema,
});

export const setTitleBulletsToolDefinition = toolDefinition({
  name: "set_experience_title_bullets",
  description:
    "Replace a title's whole bullet list with these texts in order. Wording that already exists keeps its bullet id, the rest reuses leftover slots, and unused bullets are removed. Use it to give other titles the canonical bullet set.",
  inputSchema: setTitleBulletsToolInputSchema,
  outputSchema: setTitleBulletsToolOutputSchema,
});

/** Every tool the experience assistant can call; `client-tools` must implement exactly these names. */
export const experienceToolDefinitions = [
  listExperienceTitlesToolDefinition,
  listExperienceBulletsToolDefinition,
  updateExperienceBulletToolDefinition,
  moveExperienceBulletToolDefinition,
  deleteExperienceBulletToolDefinition,
  setTitleBulletsToolDefinition,
] as const;
