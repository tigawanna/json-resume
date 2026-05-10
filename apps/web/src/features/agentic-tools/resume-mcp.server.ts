import "@tanstack/react-start/server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createResumeAgenticServerClient } from "./resume-orpc-client.server";
import {
  addExperienceBulletToolInputSchema,
  cloneResumeToolInputSchema,
  createResumeFromDocumentToolInputSchema,
  getResumeDocumentToolInputSchema,
  listResumesToolInputSchema,
  replaceExperienceBulletsToolInputSchema,
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

  server.registerTool(
    "add_experience_bullet",
    {
      title: "Add Experience Bullet",
      description:
        "Append or insert an honest tailored bullet under an existing experience owned by the authenticated user.",
      inputSchema: addExperienceBulletToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.experienceBullets.add(input)),
  );

  server.registerTool(
    "replace_experience_bullets",
    {
      title: "Replace Experience Bullets",
      description:
        "Replace all bullets for an existing experience. Use this only when rewriting the complete bullet set for that role.",
      inputSchema: replaceExperienceBulletsToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.experienceBullets.replace(input)),
  );

  server.registerTool(
    "create_resume_from_document",
    {
      title: "Create Resume From Document",
      description:
        "Create a new tailored resume from a complete ResumeDocumentV1 JSON document assembled from selected blocks.",
      inputSchema: createResumeFromDocumentToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.resumes.createFromDocument(input)),
  );

  server.registerTool(
    "clone_resume",
    {
      title: "Clone Resume",
      description:
        "Clone an owned resume into a new draft, optionally overriding the new draft's metadata.",
      inputSchema: cloneResumeToolInputSchema.shape,
    },
    async (input) => jsonToolResult(await client.resumes.clone(input)),
  );

  return server;
}
