import { toolDefinition } from "@tanstack/ai";
import {
  removeFromResumeToolInputSchema,
  removeFromResumeToolOutputSchema,
  reorderSectionToolInputSchema,
  reorderSectionToolOutputSchema,
  replaceResumeDocumentToolInputSchema,
  replaceResumeDocumentToolOutputSchema,
  setExperienceBulletsToolInputSchema,
  setContactsToolInputSchema,
  setContactsToolOutputSchema,
  setExperienceBulletsToolOutputSchema,
  setLinksToolInputSchema,
  setLinksToolOutputSchema,
  setNotesToolInputSchema,
  setNotesToolOutputSchema,
  setSkillsToolInputSchema,
  setSkillsToolOutputSchema,
  setSummaryToolInputSchema,
  setSummaryToolOutputSchema,
  updateResumeDetailsToolInputSchema,
  updateResumeDetailsToolOutputSchema,
  upsertEducationToolInputSchema,
  upsertEducationToolOutputSchema,
  upsertExperienceToolInputSchema,
  upsertExperienceToolOutputSchema,
  upsertProjectToolInputSchema,
  upsertProjectToolOutputSchema,
  upsertTalkToolInputSchema,
  upsertTalkToolOutputSchema,
} from "../resume-tool-schemas";

const SHARED_LIBRARY_NOTE =
  "With an id, edits that library item everywhere it appears (every résumé that shows it) and adds it to this résumé if missing; without an id, creates it (or reuses an identical one) and adds it to this résumé. Only the fields you pass change.";

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

export const upsertExperienceToolDefinition = toolDefinition({
  name: "upsert_experience",
  description: `Create or edit a work experience on a résumé. ${SHARED_LIBRARY_NOTE} Pass bullets to set the bullets this résumé shows for it.`,
  inputSchema: upsertExperienceToolInputSchema,
  outputSchema: upsertExperienceToolOutputSchema,
});

export const upsertProjectToolDefinition = toolDefinition({
  name: "upsert_project",
  description: `Create or edit a project on a résumé. ${SHARED_LIBRARY_NOTE}`,
  inputSchema: upsertProjectToolInputSchema,
  outputSchema: upsertProjectToolOutputSchema,
});

export const upsertEducationToolDefinition = toolDefinition({
  name: "upsert_education",
  description: `Create or edit an education entry on a résumé. ${SHARED_LIBRARY_NOTE}`,
  inputSchema: upsertEducationToolInputSchema,
  outputSchema: upsertEducationToolOutputSchema,
});

export const upsertTalkToolDefinition = toolDefinition({
  name: "upsert_talk",
  description: `Create or edit a talk on a résumé. ${SHARED_LIBRARY_NOTE}`,
  inputSchema: upsertTalkToolInputSchema,
  outputSchema: upsertTalkToolOutputSchema,
});

export const reorderSectionToolDefinition = toolDefinition({
  name: "reorder_section",
  description:
    "Reorder the items of one résumé section. Pass ids in the order they should appear; unlisted items follow in their current order.",
  inputSchema: reorderSectionToolInputSchema,
  outputSchema: reorderSectionToolOutputSchema,
});

export const setContactsToolDefinition = toolDefinition({
  name: "set_contacts",
  description: "Replace the contact details in a résumé's header (email, phone, location, …).",
  inputSchema: setContactsToolInputSchema,
  outputSchema: setContactsToolOutputSchema,
});

export const setLinksToolDefinition = toolDefinition({
  name: "set_links",
  description: "Replace the links in a résumé's header (GitHub, LinkedIn, portfolio, …).",
  inputSchema: setLinksToolInputSchema,
  outputSchema: setLinksToolOutputSchema,
});

export const setNotesToolDefinition = toolDefinition({
  name: "set_notes",
  description: "Replace a résumé's notes section, such as a cover letter. Empty text clears it.",
  inputSchema: setNotesToolInputSchema,
  outputSchema: setNotesToolOutputSchema,
});

export const replaceResumeDocumentToolDefinition = toolDefinition({
  name: "replace_resume_document",
  description:
    "Rewrite a whole résumé from a complete ResumeDocumentV1. Last resort for full rewrites only; the user must approve it. Read the résumé with get_resume first and carry every section over (bullets and skills as plain strings), changing only what the user asked for.",
  inputSchema: replaceResumeDocumentToolInputSchema,
  outputSchema: replaceResumeDocumentToolOutputSchema,
  needsApproval: true,
});
