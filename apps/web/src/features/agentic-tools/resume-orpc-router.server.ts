import "@tanstack/react-start/server-only";

import { searchResumeBlocksToolDefinition } from "./definitions/library-definitions";
import {
  getResumeToolDefinition,
  listResumesToolDefinition,
} from "./definitions/resume-definitions";
import { getResumeTool, listResumesTool, searchResumeBlocksTool } from "./resume-tools.server";
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

const searchResumeBlocksProcedure = resumeReadProcedure
  .route({
    method: "POST",
    path: "/resume-blocks/search",
    summary: "Search reusable resume blocks",
    description: "Search summaries, experience bullets, projects, and skills for tailoring.",
    tags: ["Agentic Resumes"],
    successStatus: 200,
  })
  .input(searchResumeBlocksToolDefinition.inputSchema)
  .output(searchResumeBlocksToolDefinition.outputSchema)
  .handler(async ({ context, input }) => searchResumeBlocksTool({ userId: context.userId }, input));

// ─── Router ───────────────────────────────────────────────────────────────────
// Grouped by domain so the server client (createRouterClient) surfaces a typed,
// namespaced API: client.resumes.list(), client.resumeBlocks.search(), etc.

export const resumeAgenticRouter = {
  resumes: {
    list: listResumesProcedure,
    get: getResumeProcedure,
  },
  resumeBlocks: {
    search: searchResumeBlocksProcedure,
  },
};

export type ResumeAgenticRouter = typeof resumeAgenticRouter;
