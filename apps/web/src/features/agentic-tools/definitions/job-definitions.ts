import { toolDefinition } from "@tanstack/ai";
import {
  attachJobToolInputSchema,
  attachJobToolOutputSchema,
  getJobToolInputSchema,
  getJobToolOutputSchema,
  listJobsToolInputSchema,
  listJobsToolOutputSchema,
  quotePayRateToolInputSchema,
  quotePayRateToolOutputSchema,
  saveJobToolInputSchema,
  saveJobToolOutputSchema,
  updateJobToolInputSchema,
  updateJobToolOutputSchema,
} from "../resume-tool-schemas";

export const quotePayRateToolDefinition = toolDefinition({
  name: "quote_pay_rate",
  description:
    "Read compensation from a posting into an exact source string and a USD-per-hour min and max. Use this instead of calculating pay. Pass the returned source unchanged as save_job payRate. An empty source means the page states no rate.",
  inputSchema: quotePayRateToolInputSchema,
  outputSchema: quotePayRateToolOutputSchema,
  metadata: { title: "Quote Pay Rate", annotations: { readOnlyHint: true } },
});

export const saveJobToolDefinition = toolDefinition({
  name: "save_job",
  description:
    "Save a job posting to the job tracker. Pass the full posting text; extract company, title, location and url when the user did not give them. For pay, call quote_pay_rate and pass its source as payRate, unchanged. Do not calculate an hourly rate; the tool stores the source text and derives hourly USD from it. A posting already tracked (same text) is updated instead of duplicated. Pass attachToResumeId to make a résumé target it.",
  inputSchema: saveJobToolInputSchema,
  outputSchema: saveJobToolOutputSchema,
});

export const updateJobToolDefinition = toolDefinition({
  name: "update_job",
  description:
    "Change a tracked job's status, notes, company, title, location, pay rate, url or posting text. Only the fields you pass change.",
  inputSchema: updateJobToolInputSchema,
  outputSchema: updateJobToolOutputSchema,
  lazy: true,
});

export const getJobToolDefinition = toolDefinition({
  name: "get_job",
  description:
    "Read one tracked job with its full posting text. Omit jobId to read the job a résumé targets (the active résumé by default).",
  inputSchema: getJobToolInputSchema,
  outputSchema: getJobToolOutputSchema,
  metadata: { title: "Get Job", annotations: { readOnlyHint: true } },
});

export const listJobsToolDefinition = toolDefinition({
  name: "list_jobs",
  description:
    "Search the user's job tracker, most recently updated first, optionally by application status. Each row lists the résumés targeting it.",
  inputSchema: listJobsToolInputSchema,
  outputSchema: listJobsToolOutputSchema,
  metadata: { title: "List Jobs", annotations: { readOnlyHint: true } },
});

export const attachJobToolDefinition = toolDefinition({
  name: "attach_job",
  description:
    "Make a résumé (the active one by default) target a tracked job, or pass jobId null to detach it.",
  inputSchema: attachJobToolInputSchema,
  outputSchema: attachJobToolOutputSchema,
});
