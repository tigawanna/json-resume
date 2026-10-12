import {
  getApplicationStatsToolDefinition,
  getProfileOverviewToolDefinition,
  startResumeForJobToolDefinition,
} from "@/features/agentic-tools/definitions/dashboard-definitions";
import type { DashboardToolContext } from "@/features/agentic-tools/definitions/tool-context";
import {
  getCoverLetterClientTool,
  getJobClientTool,
  getResumeClientTool,
  listCoverLettersClientTool,
  listJobsClientTool,
  listResumesClientTool,
  rankResumesForJobClientTool,
  saveJobClientTool,
  searchApplicationAnswersClientTool,
  searchLibraryClientTool,
} from "./client-tools";
import { getLocalApplicationStats, getLocalProfileOverview } from "./local-insight-tools";
import { startLocalResumeForJob } from "./local-start-resume-tool";

type DashboardClientToolCtx = { context: DashboardToolContext };

export const getApplicationStatsClientTool = getApplicationStatsToolDefinition.client(
  (input, ctx: DashboardClientToolCtx) => getLocalApplicationStats(ctx.context, input),
);

export const getProfileOverviewClientTool = getProfileOverviewToolDefinition.client(
  (input, ctx: DashboardClientToolCtx) => getLocalProfileOverview(ctx.context, input),
);

export const startResumeForJobClientTool = startResumeForJobToolDefinition.client(
  (input, ctx: DashboardClientToolCtx) => startLocalResumeForJob(ctx.context, input),
);

export const dashboardAssistantClientTools = [
  listResumesClientTool,
  getResumeClientTool,
  rankResumesForJobClientTool,
  saveJobClientTool,
  listJobsClientTool,
  getJobClientTool,
  searchLibraryClientTool,
  searchApplicationAnswersClientTool,
  listCoverLettersClientTool,
  getCoverLetterClientTool,
  getApplicationStatsClientTool,
  getProfileOverviewClientTool,
  startResumeForJobClientTool,
];
