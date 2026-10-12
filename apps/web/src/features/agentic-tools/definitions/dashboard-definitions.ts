import { toolDefinition } from "@tanstack/ai";
import {
  getApplicationStatsToolInputSchema,
  getApplicationStatsToolOutputSchema,
  getProfileOverviewToolInputSchema,
  getProfileOverviewToolOutputSchema,
  startResumeForJobToolInputSchema,
  startResumeForJobToolOutputSchema,
} from "../dashboard-tool-schemas";

export const startResumeForJobToolDefinition = toolDefinition({
  name: "start_resume_for_job",
  description:
    "Propose the résumé to work on for a job and, once the user approves, reuse it as it is or copy it into a new draft for the job, then open it in the editor's assistant with your suggested first prompt. Call it once, last, after save_job and rank_resumes_for_job.",
  inputSchema: startResumeForJobToolInputSchema,
  outputSchema: startResumeForJobToolOutputSchema,
  needsApproval: true,
});

export const getApplicationStatsToolDefinition = toolDefinition({
  name: "get_application_stats",
  description:
    "Summarize the job tracker: jobs per status, how many applications were sent, interview and offer rates, a monthly breakdown and the latest jobs.",
  inputSchema: getApplicationStatsToolInputSchema,
  outputSchema: getApplicationStatsToolOutputSchema,
  metadata: { title: "Get Application Stats", annotations: { readOnlyHint: true } },
});

export const getProfileOverviewToolDefinition = toolDefinition({
  name: "get_profile_overview",
  description:
    "Summarize who the user is professionally from their library: item counts, years of experience, roles, résumé headlines, most used skills and technologies, and education.",
  inputSchema: getProfileOverviewToolInputSchema,
  outputSchema: getProfileOverviewToolOutputSchema,
  metadata: { title: "Get Profile Overview", annotations: { readOnlyHint: true } },
});
