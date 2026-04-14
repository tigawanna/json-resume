import "@tanstack/react-start/server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resumeDocumentV1Schema } from "@/features/resume/resume-schema";
import {
  mcpListResumes,
  mcpGetResume,
  mcpCreateResume,
  mcpListPinnedProjects,
  mcpGetPrompt,
} from "./mcp-data.server";

export function createMcpServerForUser(userId: string): McpServer {
  const server = new McpServer({
    name: "agentic-json-resume",
    version: "1.0.0",
  });

  server.tool(
    "list_resumes",
    "List all resumes for the authenticated user. Returns id, name, description, and updatedAt.",
    {},
    async () => {
      const resumes = await mcpListResumes(userId);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(resumes, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "get_resume",
    "Get the full resume JSON for a given resume ID. Includes the ResumeDocumentV1 data, job description, and metadata.",
    { resumeId: z.string().describe("The ID of the resume to retrieve") },
    async ({ resumeId }) => {
      const result = await mcpGetResume(userId, resumeId);
      if (!result) {
        return {
          content: [{ type: "text" as const, text: "Resume not found" }],
          isError: true,
        };
      }
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    },
  );

  server.tool(
    "create_resume",
    "Create a new resume from a ResumeDocumentV1 JSON payload. Returns the new resume ID.",
    {
      name: z.string().describe("Name for the resume"),
      description: z
        .string()
        .optional()
        .default("")
        .describe("Short description of the resume"),
      jobDescription: z
        .string()
        .optional()
        .default("")
        .describe("The job description this resume targets"),
      data: resumeDocumentV1Schema.describe(
        "The full ResumeDocumentV1 JSON object",
      ),
    },
    async ({ name, description, jobDescription, data }) => {
      const result = await mcpCreateResume(userId, {
        name,
        description,
        jobDescription,
        data,
      });
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    },
  );

  server.tool(
    "list_pinned_projects",
    "List the user's pinned GitHub projects. These are shortlisted repos for use in resume context.",
    {},
    async () => {
      const projects = await mcpListPinnedProjects(userId);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(projects, null, 2) },
        ],
      };
    },
  );

  server.tool(
    "get_prompt",
    "Get a ready-to-use LLM prompt that tailors a resume to a job description. Includes the resume JSON, the job description, pinned projects context, and tailoring instructions. Feed this to your LLM and pass the output to create_resume.",
    {
      resumeId: z
        .string()
        .describe("The ID of the base resume to tailor"),
      jobDescription: z
        .string()
        .optional()
        .default("")
        .describe(
          "The job description to tailor for. Falls back to the one saved on the resume if empty.",
        ),
    },
    async ({ resumeId, jobDescription }) => {
      try {
        const prompt = await mcpGetPrompt(userId, resumeId, jobDescription);
        return {
          content: [{ type: "text" as const, text: prompt }],
        };
      } catch (err: unknown) {
        return {
          content: [
            {
              type: "text" as const,
              text: err instanceof Error ? err.message : "Unknown error",
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}
