import { toolDefinition } from "@tanstack/ai";
import {
  searchCurrentResumeBlocksToolInputSchema,
  searchResumeBlocksToolInputSchema,
  searchResumeBlocksToolOutputSchema,
} from "../resume-tool-schemas";

export const searchResumeBlocksToolDefinition = toolDefinition({
  name: "search_resume_blocks",
  description:
    "Search reusable resume blocks such as summaries, experience bullets, projects, and skills. Use this to gather relevant material for a job description.",
  inputSchema: searchResumeBlocksToolInputSchema,
  outputSchema: searchResumeBlocksToolOutputSchema,
  metadata: { title: "Search Resume Blocks", annotations: { readOnlyHint: true } },
});

export const searchCurrentResumeBlocksToolDefinition = toolDefinition({
  name: "search_current_resume_blocks",
  description:
    "Search summaries, experience bullets, projects, and skills on the active resume using keywords from the target role.",
  inputSchema: searchCurrentResumeBlocksToolInputSchema,
  outputSchema: searchResumeBlocksToolOutputSchema,
});
