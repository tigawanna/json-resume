import { toolDefinition } from "@tanstack/ai";
import {
  cloneCurrentResumeToolInputSchema,
  cloneResumeToolOutputSchema,
  createResumeFromDocumentToolInputSchema,
  createResumeFromDocumentToolOutputSchema,
  getResumeToolInputSchema,
  getResumeToolOutputSchema,
  listResumesToolInputSchema,
  listResumesToolOutputSchema,
  navigateToResumeToolInputSchema,
  navigateToResumeToolOutputSchema,
  setActiveResumeToolInputSchema,
  setActiveResumeToolOutputSchema,
  updateCurrentResumeDocumentToolInputSchema,
  updateResumeDocumentToolOutputSchema,
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

export const cloneCurrentResumeToolDefinition = toolDefinition({
  name: "clone_current_resume",
  description:
    "Clone the active resume into a new draft. Only when the user asks for a copy or variant. The clone does not become active; call set_active_resume to keep editing it.",
  inputSchema: cloneCurrentResumeToolInputSchema,
  outputSchema: cloneResumeToolOutputSchema,
});

export const createResumeFromDocumentToolDefinition = toolDefinition({
  name: "create_resume_from_document",
  description:
    "Create a new resume draft from a complete ResumeDocumentV1 JSON document assembled from selected blocks.",
  inputSchema: createResumeFromDocumentToolInputSchema,
  outputSchema: createResumeFromDocumentToolOutputSchema,
});

export const navigateToResumeToolDefinition = toolDefinition({
  name: "navigate_to_resume",
  description:
    "Navigate the user to a resume after a successful clone, fork, or new draft creation so they can see the resume being worked on.",
  inputSchema: navigateToResumeToolInputSchema,
  outputSchema: navigateToResumeToolOutputSchema,
});

export const updateCurrentResumeDocumentToolDefinition = toolDefinition({
  name: "update_current_resume_document",
  description:
    "Replace the whole content of the active resume with a complete ResumeDocumentV1. Read it with get_resume first and carry every section over (bullets and skills as plain strings), changing only what the user asked for.",
  inputSchema: updateCurrentResumeDocumentToolInputSchema,
  outputSchema: updateResumeDocumentToolOutputSchema,
});
