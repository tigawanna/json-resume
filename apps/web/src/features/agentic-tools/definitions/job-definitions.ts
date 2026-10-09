import { toolDefinition } from "@tanstack/ai";
import {
  attachJobToCurrentResumeToolInputSchema,
  attachJobToCurrentResumeToolOutputSchema,
  listJobsToolInputSchema,
  listJobsToolOutputSchema,
  saveJobToolInputSchema,
  saveJobToolOutputSchema,
} from "../resume-tool-schemas";

export const saveJobToolDefinition = toolDefinition({
  name: "save_job",
  description:
    "Save a job posting to the independent job tracker. Description is required. If the user did not give a company name, extract it from the posting text (and optionally title, location, and url). Set attachToCurrentResume true to use this job as the target for the active resume.",
  inputSchema: saveJobToolInputSchema,
  outputSchema: saveJobToolOutputSchema,
});

export const listJobsToolDefinition = toolDefinition({
  name: "list_jobs",
  description:
    "List jobs in the user's tracker, optionally filtered by keyword or application status.",
  inputSchema: listJobsToolInputSchema,
  outputSchema: listJobsToolOutputSchema,
});

export const attachJobToCurrentResumeToolDefinition = toolDefinition({
  name: "attach_job_to_current_resume",
  description:
    "Link an existing tracked job to the active resume so its description is used for AI tailoring.",
  inputSchema: attachJobToCurrentResumeToolInputSchema,
  outputSchema: attachJobToCurrentResumeToolOutputSchema,
});
