import "@tanstack/react-start/server-only";

import { getJobToolDefinition, listJobsToolDefinition } from "./definitions/job-definitions";
import {
  rankLibraryForJobToolDefinition,
  searchLibraryToolDefinition,
} from "./definitions/library-definitions";
import {
  getResumeToolDefinition,
  listResumesToolDefinition,
  rankResumesForJobToolDefinition,
} from "./definitions/resume-definitions";
import type { RemoteToolContext } from "./definitions/tool-context";
import { getJobTool, listJobsTool } from "./job-tools.server";
import { rankResumesForJobTool } from "./rank-tools.server";
import { rankLibraryForJobTool, searchLibraryTool } from "./library-tools.server";
import { getResumeTool, listResumesTool } from "./resume-tools.server";

/** Callers must supply `{ userId }` as tool context; a missing one must never reach a query. */
function requireRemoteContext(context: RemoteToolContext | undefined): RemoteToolContext {
  if (!context?.userId) throw new Error("Unauthorized");
  return { userId: context.userId };
}

export const listResumesRemoteTool = listResumesToolDefinition.server<RemoteToolContext>(
  (input, ctx) => listResumesTool(requireRemoteContext(ctx.context), input),
);

export const getResumeRemoteTool = getResumeToolDefinition.server<RemoteToolContext>((input, ctx) =>
  getResumeTool(requireRemoteContext(ctx.context), input),
);

export const searchLibraryRemoteTool = searchLibraryToolDefinition.server<RemoteToolContext>(
  (input, ctx) => searchLibraryTool(requireRemoteContext(ctx.context), input),
);

export const rankLibraryForJobRemoteTool =
  rankLibraryForJobToolDefinition.server<RemoteToolContext>((input, ctx) =>
    rankLibraryForJobTool(requireRemoteContext(ctx.context), input),
  );

export const listJobsRemoteTool = listJobsToolDefinition.server<RemoteToolContext>((input, ctx) =>
  listJobsTool(requireRemoteContext(ctx.context), input),
);

export const getJobRemoteTool = getJobToolDefinition.server<RemoteToolContext>((input, ctx) =>
  getJobTool(requireRemoteContext(ctx.context), input),
);

export const rankResumesForJobRemoteTool =
  rankResumesForJobToolDefinition.server<RemoteToolContext>((input, ctx) =>
    rankResumesForJobTool(requireRemoteContext(ctx.context), input),
  );

/** Read-only tools over the materialized tables, served by MCP. */
export const remoteResumeTools = [
  listResumesRemoteTool,
  getResumeRemoteTool,
  searchLibraryRemoteTool,
  listJobsRemoteTool,
  getJobRemoteTool,
  rankResumesForJobRemoteTool,
  rankLibraryForJobRemoteTool,
] as const;
