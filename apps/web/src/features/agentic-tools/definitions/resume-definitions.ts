import { toolDefinition } from "@tanstack/ai";
import {
  getResumeDocumentToolInputSchema,
  getResumeDocumentToolOutputSchema,
  listResumesToolInputSchema,
  listResumesToolOutputSchema,
} from "../resume-tool-schemas";

export const listResumesToolDefinition = toolDefinition({
  name: "list_resumes",
  description:
    "List the authenticated user's resumes. Use this first when the user did not provide a resume id.",
  inputSchema: listResumesToolInputSchema,
  outputSchema: listResumesToolOutputSchema,
  metadata: { title: "List Resumes", annotations: { readOnlyHint: true } },
});

export const getResumeDocumentToolDefinition = toolDefinition({
  name: "get_resume_document",
  description:
    "Load one resume as the normalized ResumeDocumentV1 JSON used by the editor, renderer, and tailoring pipeline.",
  inputSchema: getResumeDocumentToolInputSchema,
  outputSchema: getResumeDocumentToolOutputSchema,
  metadata: { title: "Get Resume Document", annotations: { readOnlyHint: true } },
});
