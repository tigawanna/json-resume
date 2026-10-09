import { toolDefinition } from "@tanstack/ai";
import {
  cloneResumeToolInputSchema,
  cloneResumeToolOutputSchema,
  createResumeToolInputSchema,
  createResumeToolOutputSchema,
  getResumeToolInputSchema,
  getResumeToolOutputSchema,
  listResumesToolInputSchema,
  listResumesToolOutputSchema,
  openResumeToolInputSchema,
  openResumeToolOutputSchema,
  rankResumesForJobToolInputSchema,
  rankResumesForJobToolOutputSchema,
  setActiveResumeToolInputSchema,
  setActiveResumeToolOutputSchema,
  tailorResumeForJobToolInputSchema,
  tailorResumeForJobToolOutputSchema,
} from "../resume-tool-schemas";

export const listResumesToolDefinition = toolDefinition({
  name: "list_resumes",
  description:
    "List the authenticated user's resumes. Use this first when the user did not provide a resume id.",
  inputSchema: listResumesToolInputSchema,
  outputSchema: listResumesToolOutputSchema,
  metadata: { title: "List Resumes", annotations: { readOnlyHint: true } },
});

export const getResumeToolDefinition = toolDefinition({
  name: "get_resume",
  description:
    "Read one resume: its sections with the id of every item and bullet, plus the linked job. Request only the sections you need.",
  inputSchema: getResumeToolInputSchema,
  outputSchema: getResumeToolOutputSchema,
  metadata: { title: "Get Resume", annotations: { readOnlyHint: true } },
});

export const setActiveResumeToolDefinition = toolDefinition({
  name: "set_active_resume",
  description:
    "Make another resume the active one, so every following tool call reads and edits it by default. Does not navigate.",
  inputSchema: setActiveResumeToolInputSchema,
  outputSchema: setActiveResumeToolOutputSchema,
});

export const cloneResumeToolDefinition = toolDefinition({
  name: "clone_resume",
  description:
    "Copy a résumé (the active one by default) into a new draft that shares its library items. Only when the user asks for a copy or variant. The copy becomes active unless makeActive is false; pass jobId to retarget it.",
  inputSchema: cloneResumeToolInputSchema,
  outputSchema: cloneResumeToolOutputSchema,
});

export const createResumeToolDefinition = toolDefinition({
  name: "create_resume",
  description:
    "Create a new résumé: blank, or imported from a complete parsed document when the user pastes a whole résumé. It becomes active unless makeActive is false.",
  inputSchema: createResumeToolInputSchema,
  outputSchema: createResumeToolOutputSchema,
  lazy: true,
});

export const openResumeToolDefinition = toolDefinition({
  name: "open_resume",
  description:
    "Show a résumé (the active one by default) in the editor once this reply finishes. The conversation moves with it. Call it last.",
  inputSchema: openResumeToolInputSchema,
  outputSchema: openResumeToolOutputSchema,
});

export const rankResumesForJobToolDefinition = toolDefinition({
  name: "rank_resumes_for_job",
  description:
    "Score the user's résumés against a job by keyword coverage and return the best matches with matched and missing terms. Use it to pick the résumé to start from.",
  inputSchema: rankResumesForJobToolInputSchema,
  outputSchema: rankResumesForJobToolOutputSchema,
  metadata: { title: "Rank Resumes For Job", annotations: { readOnlyHint: true } },
});

export const tailorResumeForJobToolDefinition = toolDefinition({
  name: "tailor_resume_for_job",
  description:
    "One step for a tailored copy: copies the base résumé (or the best match for the job), points the copy at the job, makes it active and returns its content with the job keywords it is missing. Then edit it with the setters and upserts.",
  inputSchema: tailorResumeForJobToolInputSchema,
  outputSchema: tailorResumeForJobToolOutputSchema,
});
