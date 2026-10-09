import { toolDefinition } from "@tanstack/ai";
import {
  removeFromResumeToolInputSchema,
  removeFromResumeToolOutputSchema,
  setExperienceBulletsToolInputSchema,
  setExperienceBulletsToolOutputSchema,
  setSkillsToolInputSchema,
  setSkillsToolOutputSchema,
  setSummaryToolInputSchema,
  setSummaryToolOutputSchema,
  updateResumeDetailsToolInputSchema,
  updateResumeDetailsToolOutputSchema,
} from "../resume-tool-schemas";

export const updateResumeDetailsToolDefinition = toolDefinition({
  name: "update_resume_details",
  description:
    "Change the résumé's name, full name, headline, description or template. Only the fields you pass change.",
  inputSchema: updateResumeDetailsToolInputSchema,
  outputSchema: updateResumeDetailsToolOutputSchema,
});

export const setSummaryToolDefinition = toolDefinition({
  name: "set_summary",
  description: "Replace the professional summary of a résumé.",
  inputSchema: setSummaryToolInputSchema,
  outputSchema: setSummaryToolOutputSchema,
});

export const setExperienceBulletsToolDefinition = toolDefinition({
  name: "set_experience_bullets",
  description:
    "Rewrite the bullets one experience shows on a résumé. Pass the full list in order; bullets you leave out are dropped from this résumé but stay in the library.",
  inputSchema: setExperienceBulletsToolInputSchema,
  outputSchema: setExperienceBulletsToolOutputSchema,
});

export const setSkillsToolDefinition = toolDefinition({
  name: "set_skills",
  description:
    "Replace all skill groups on a résumé. Read the current skills with get_resume first and pass the full new list.",
  inputSchema: setSkillsToolInputSchema,
  outputSchema: setSkillsToolOutputSchema,
});

export const removeFromResumeToolDefinition = toolDefinition({
  name: "remove_from_resume",
  description:
    "Take one item off a résumé (an experience, project, skill group, summary, …). The item stays in the library for other résumés.",
  inputSchema: removeFromResumeToolInputSchema,
  outputSchema: removeFromResumeToolOutputSchema,
});
