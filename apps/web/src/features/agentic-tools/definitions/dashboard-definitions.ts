import { toolDefinition } from "@tanstack/ai";
import {
  getApplicationStatsToolInputSchema,
  getApplicationStatsToolOutputSchema,
  getProfileOverviewToolInputSchema,
  getProfileOverviewToolOutputSchema,
  startResumeForJobToolInputSchema,
  startResumeForJobToolOutputSchema,
} from "@repo/isomorphic/agentic/tool-schemas/dashboard/index";
import {
  startFirstResumeToolInputSchema,
  startFirstResumeToolOutputSchema,
} from "@repo/isomorphic/agentic/tool-schemas/first-resume";

export const startResumeForJobToolDefinition = toolDefinition({
  name: "start_resume_for_job",
  description:
    "Choose the résumé to start from. On approval, clone it (mode copy), rename the copy for the job, attach the saved job, then open the copy on its AI tab and hand the editor your suggestedPrompt. Call it once, last, after save_job and rank_resumes_for_job.",
  inputSchema: startResumeForJobToolInputSchema,
  outputSchema: startResumeForJobToolOutputSchema,
  needsApproval: true,
});

export const startFirstResumeToolDefinition = toolDefinition({
  name: "start_first_resume",
  description:
    "Create a new résumé (blank or from a parsed paste) and open it on its AI tab with your suggestedPrompt. Use it when the user has no résumés, or they want one from scratch. Do not tell them to create it in the UI. Call it after ask_user intake. No approval.",
  inputSchema: startFirstResumeToolInputSchema,
  outputSchema: startFirstResumeToolOutputSchema,
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
