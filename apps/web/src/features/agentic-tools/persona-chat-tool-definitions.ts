import { toolDefinition } from "@tanstack/ai";
import {
  cloneResumeToolInputSchema,
  cloneResumeToolOutputSchema,
  createResumeFromDocumentToolInputSchema,
  createResumeFromDocumentToolOutputSchema,
  getResumeDocumentToolInputSchema,
  getResumeDocumentToolOutputSchema,
  listResumesToolInputSchema,
  listResumesToolOutputSchema,
  searchResumeBlocksToolInputSchema,
  searchResumeBlocksToolOutputSchema,
} from "./resume-tool-schemas";

export const listPersonaResumesToolDefinition = toolDefinition({
  name: "list_resumes",
  description:
    "List the user's resumes and resume variants so you can choose the best source material before writing or answering persona questions.",
  inputSchema: listResumesToolInputSchema,
  outputSchema: listResumesToolOutputSchema,
});

export const getPersonaResumeDocumentToolDefinition = toolDefinition({
  name: "get_resume_document",
  description:
    "Load one resume as complete structured ResumeDocumentV1 JSON when you need exact facts, dates, projects, or enough source material to create another resume.",
  inputSchema: getResumeDocumentToolInputSchema,
  outputSchema: getResumeDocumentToolOutputSchema,
});

export const searchPersonaResumeBlocksToolDefinition = toolDefinition({
  name: "search_resume_blocks",
  description:
    "Search across all resume summaries, experience bullets, projects, and skills. Omit resumeId to search the user's whole persona library.",
  inputSchema: searchResumeBlocksToolInputSchema,
  outputSchema: searchResumeBlocksToolOutputSchema,
});

export const clonePersonaResumeToolDefinition = toolDefinition({
  name: "clone_resume",
  description:
    "Clone an existing resume into a new draft, optionally changing name, description, or target job description.",
  inputSchema: cloneResumeToolInputSchema,
  outputSchema: cloneResumeToolOutputSchema,
});

export const createPersonaResumeFromDocumentToolDefinition = toolDefinition({
  name: "create_resume_from_document",
  description:
    "Create a new resume draft from a complete ResumeDocumentV1 JSON document assembled from selected persona facts.",
  inputSchema: createResumeFromDocumentToolInputSchema,
  outputSchema: createResumeFromDocumentToolOutputSchema,
});
