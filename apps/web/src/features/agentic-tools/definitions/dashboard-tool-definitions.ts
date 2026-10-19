import {
  getCoverLetterToolDefinition,
  listCoverLettersToolDefinition,
} from "./cover-letter-definitions";
import { searchApplicationAnswersToolDefinition } from "./application-answer-definitions";
import {
  getApplicationStatsToolDefinition,
  getProfileOverviewToolDefinition,
  startResumeForJobToolDefinition,
} from "./dashboard-definitions";
import {
  getJobToolDefinition,
  listJobsToolDefinition,
  quotePayRateToolDefinition,
  saveJobToolDefinition,
} from "./job-definitions";
import { searchLibraryToolDefinition } from "./library-definitions";
import {
  getResumeToolDefinition,
  listResumesToolDefinition,
  rankResumesForJobToolDefinition,
} from "./resume-definitions";

/**
 * Every tool the dashboard assistant can call: picking a résumé for a job and
 * read-only insights. It never edits résumés; that is the editor assistant's job.
 * `dashboard-client-tools.ts` must implement exactly these names.
 */
export const dashboardChatToolDefinitions = [
  listResumesToolDefinition,
  getResumeToolDefinition,
  rankResumesForJobToolDefinition,
  quotePayRateToolDefinition,
  saveJobToolDefinition,
  listJobsToolDefinition,
  getJobToolDefinition,
  searchLibraryToolDefinition,
  searchApplicationAnswersToolDefinition,
  listCoverLettersToolDefinition,
  getCoverLetterToolDefinition,
  getApplicationStatsToolDefinition,
  getProfileOverviewToolDefinition,
  startResumeForJobToolDefinition,
] as const;
