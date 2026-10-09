import "@tanstack/react-start/server-only";

import { getJobToolDefinition, listJobsToolDefinition } from "./definitions/job-definitions";
import {
  rankLibraryForJobToolDefinition,
  searchLibraryToolDefinition,
} from "./definitions/library-definitions";
import { rankLibraryForJobTool, searchLibraryTool } from "./library-tools.server";
import { getJobTool, listJobsTool } from "./job-tools.server";
import {
  getResumeToolDefinition,
  listResumesToolDefinition,
  rankResumesForJobToolDefinition,
} from "./definitions/resume-definitions";
import { rankResumesForJobTool } from "./rank-tools.server";
import { getResumeTool, listResumesTool } from "./resume-tools.server";
import { resumeReadProcedure } from "./resume-orpc-base.server";

// ─── Read procedures ──────────────────────────────────────────────────────────
// Require resumes:read permission. Safe to expose to read-only API keys.
// Résumé edits happen on the client and sync as events; there are no server write tools.
// Input/output schemas come from the shared tool definitions so oRPC, MCP and chat agree.

const listResumesProcedure = resumeReadProcedure
  .route({
    method: "POST",
    path: "/resumes/list",
    summary: "List resumes",
    description: "List resumes available to the authenticated agentic API caller.",
    tags: ["Agentic Resumes"],
    successStatus: 200,
  })
  .input(listResumesToolDefinition.inputSchema)
  .output(listResumesToolDefinition.outputSchema)
  .handler(async ({ context, input }) => listResumesTool({ userId: context.userId }, input));

const getResumeProcedure = resumeReadProcedure
  .route({
    method: "POST",
    path: "/resumes/get",
    summary: "Get a resume",
    description:
      "Load one resume's sections (with item ids) and its linked job. Pass sections to limit the payload.",
    tags: ["Agentic Resumes"],
    successStatus: 200,
  })
  .input(getResumeToolDefinition.inputSchema)
  .output(getResumeToolDefinition.outputSchema)
  .handler(async ({ context, input }) => getResumeTool({ userId: context.userId }, input));

const rankResumesForJobProcedure = resumeReadProcedure
  .route({
    method: "POST",
    path: "/resumes/rank-for-job",
    summary: "Rank resumes for a job",
    description:
      "Score the caller's most recent résumés by keyword coverage of a tracked job or pasted posting text.",
    tags: ["Agentic Resumes"],
    successStatus: 200,
  })
  .input(rankResumesForJobToolDefinition.inputSchema)
  .output(rankResumesForJobToolDefinition.outputSchema)
  .handler(async ({ context, input }) => rankResumesForJobTool({ userId: context.userId }, input));

const searchLibraryProcedure = resumeReadProcedure
  .route({
    method: "POST",
    path: "/library/search",
    summary: "Search the library",
    description:
      "Search one library section (summaries, experiences, bullets, education, projects, talks, skills) with paging. Pass resumeId to flag items that résumé shows.",
    tags: ["Agentic Library"],
    successStatus: 200,
  })
  .input(searchLibraryToolDefinition.inputSchema)
  .output(searchLibraryToolDefinition.outputSchema)
  .handler(async ({ context, input }) => searchLibraryTool({ userId: context.userId }, input));

const rankLibraryForJobProcedure = resumeReadProcedure
  .route({
    method: "POST",
    path: "/library/rank-for-job",
    summary: "Rank library items for a job",
    description:
      "Library items mentioning the most keywords of a tracked job or pasted posting, skipping ones the résumé already shows.",
    tags: ["Agentic Library"],
    successStatus: 200,
  })
  .input(rankLibraryForJobToolDefinition.inputSchema)
  .output(rankLibraryForJobToolDefinition.outputSchema)
  .handler(async ({ context, input }) => rankLibraryForJobTool({ userId: context.userId }, input));

const listJobsProcedure = resumeReadProcedure
  .route({
    method: "POST",
    path: "/jobs/list",
    summary: "List tracked jobs",
    description: "Search the job tracker, with the résumés targeting each job.",
    tags: ["Agentic Jobs"],
    successStatus: 200,
  })
  .input(listJobsToolDefinition.inputSchema)
  .output(listJobsToolDefinition.outputSchema)
  .handler(async ({ context, input }) => listJobsTool({ userId: context.userId }, input));

const getJobProcedure = resumeReadProcedure
  .route({
    method: "POST",
    path: "/jobs/get",
    summary: "Get a tracked job",
    description: "Load one job with its full posting text, by jobId or by the résumé targeting it.",
    tags: ["Agentic Jobs"],
    successStatus: 200,
  })
  .input(getJobToolDefinition.inputSchema)
  .output(getJobToolDefinition.outputSchema)
  .handler(async ({ context, input }) => getJobTool({ userId: context.userId }, input));

// ─── Router ───────────────────────────────────────────────────────────────────
// Grouped by domain so the server client (createRouterClient) surfaces a typed,
// namespaced API: client.resumes.list(), client.library.search(), etc.

export const resumeAgenticRouter = {
  resumes: {
    list: listResumesProcedure,
    get: getResumeProcedure,
    rankForJob: rankResumesForJobProcedure,
  },
  library: {
    search: searchLibraryProcedure,
    rankForJob: rankLibraryForJobProcedure,
  },
  jobs: {
    list: listJobsProcedure,
    get: getJobProcedure,
  },
};

export type ResumeAgenticRouter = typeof resumeAgenticRouter;
