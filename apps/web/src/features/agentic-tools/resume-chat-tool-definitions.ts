import { toolDefinition } from "@tanstack/ai";
import {
  cloneCurrentResumeToolInputSchema,
  cloneResumeToolOutputSchema,
  createResumeFromDocumentToolInputSchema,
  createResumeFromDocumentToolOutputSchema,
  getResumeDocumentToolOutputSchema,
  navigateToResumeToolInputSchema,
  navigateToResumeToolOutputSchema,
  refreshResumePreviewToolInputSchema,
  refreshResumePreviewToolOutputSchema,
  resumeBlockTypeSchema,
  searchResumeBlocksToolOutputSchema,
  updateCurrentResumeDocumentToolInputSchema,
  updateResumeDocumentToolOutputSchema,
} from "./resume-tool-schemas";
import { z } from "zod";

const searchCurrentResumeBlocksInputSchema = z.object({
  keyword: z.string().trim().min(1).optional(),
  blockTypes: z.array(resumeBlockTypeSchema).min(1).optional(),
  limitPerType: z.coerce.number().int().min(1).max(20).default(8),
});

export const getCurrentResumeDocumentToolDefinition = toolDefinition({
  name: "get_current_resume_document",
  description:
    "Load the current working resume as structured ResumeDocumentV1 JSON before tailoring or giving specific rewrite advice.",
  outputSchema: getResumeDocumentToolOutputSchema,
});

export const searchCurrentResumeBlocksToolDefinition = toolDefinition({
  name: "search_current_resume_blocks",
  description:
    "Search summaries, experience bullets, projects, and skills from the current resume using keywords from the target role.",
  inputSchema: searchCurrentResumeBlocksInputSchema,
  outputSchema: searchResumeBlocksToolOutputSchema,
});

export const cloneCurrentResumeToolDefinition = toolDefinition({
  name: "clone_current_resume",
  description:
    "Clone the current working resume into a new draft. Use this before making a tailored variant so the original resume remains intact.",
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

export const refreshResumePreviewToolDefinition = toolDefinition({
  name: "refresh_resume_preview",
  description:
    "Refresh the client-side resume data after a resume tool writes to the database so the user can preview the latest state.",
  inputSchema: refreshResumePreviewToolInputSchema,
  outputSchema: refreshResumePreviewToolOutputSchema,
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
    "Replace the content of the current working resume with an updated ResumeDocumentV1. Always call get_current_resume_document first, apply your edits to the returned document, then call this tool. Follow with refresh_resume_preview so the user sees the changes.",
  inputSchema: updateCurrentResumeDocumentToolInputSchema,
  outputSchema: updateResumeDocumentToolOutputSchema,
});
