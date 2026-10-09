import "@tanstack/react-start/server-only";

import { searchResumeBlocksToolDefinition } from "./definitions/library-definitions";
import {
  getResumeDocumentToolDefinition,
  listResumesToolDefinition,
} from "./definitions/resume-definitions";
import type { RemoteToolContext } from "./definitions/tool-context";
import {
  getResumeDocumentTool,
  listResumesTool,
  searchResumeBlocksTool,
} from "./resume-tools.server";

/** Callers must supply `{ userId }` as tool context; a missing one must never reach a query. */
function requireRemoteContext(context: RemoteToolContext | undefined): RemoteToolContext {
  if (!context?.userId) throw new Error("Unauthorized");
  return { userId: context.userId };
}

export const listResumesRemoteTool = listResumesToolDefinition.server<RemoteToolContext>(
  (input, ctx) => listResumesTool(requireRemoteContext(ctx.context), input),
);

export const getResumeDocumentRemoteTool =
  getResumeDocumentToolDefinition.server<RemoteToolContext>((input, ctx) =>
    getResumeDocumentTool(requireRemoteContext(ctx.context), input),
  );

export const searchResumeBlocksRemoteTool =
  searchResumeBlocksToolDefinition.server<RemoteToolContext>((input, ctx) =>
    searchResumeBlocksTool(requireRemoteContext(ctx.context), input),
  );

/** Read-only tools over the materialized tables, served by MCP. */
export const remoteResumeTools = [
  listResumesRemoteTool,
  getResumeDocumentRemoteTool,
  searchResumeBlocksRemoteTool,
] as const;
