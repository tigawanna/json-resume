import "@tanstack/react-start/server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createResumeAgenticServerClient } from "./resume-orpc-client.server";
import {
  getResumeDocumentToolInputSchema,
  listResumesToolInputSchema,
  searchResumeBlocksToolInputSchema,
} from "./resume-tool-schemas";

function jsonToolResult<T extends Record<string, unknown>>(data: T): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export function createResumeMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "agentic-json-resume",
    version: "0.1.0",
  });
  const client = createResumeAgenticServerClient(userId);

  server.registerTool(
    "list_resumes",
    {
      title: "List Resumes",
      description:
        "List the authenticated user's resumes. Use this first when the user did not provide a resume id.",
      inputSchema: listResumesToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.resumes.list(input)),
  );

  server.registerTool(
    "get_resume_document",
    {
      title: "Get Resume Document",
      description:
        "Load one resume as the normalized ResumeDocumentV1 JSON used by the editor, renderer, and tailoring pipeline.",
      inputSchema: getResumeDocumentToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.resumes.document(input)),
  );

  server.registerTool(
    "search_resume_blocks",
    {
      title: "Search Resume Blocks",
      description:
        "Search reusable resume blocks such as summaries, experience bullets, projects, and skills. Use this to gather relevant material for a job description.",
      inputSchema: searchResumeBlocksToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.resumeBlocks.search(input)),
  );

  return server;
}
