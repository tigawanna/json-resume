import {
  agenticOptionsResponse,
  handleAgenticToolRequest,
} from "@/features/agentic-tools/resume-api.server";
import { searchResumeBlocksToolInputSchema } from "@/features/agentic-tools/resume-tool-schemas";
import { searchResumeBlocksTool } from "@/features/agentic-tools/resume-tools.server";
import { createFileRoute } from "@tanstack/react-router";

async function post(request: Request): Promise<Response> {
  return handleAgenticToolRequest({
    request,
    permissions: { resumes: ["read"] },
    parse: (raw) => searchResumeBlocksToolInputSchema.parse(raw),
    execute: searchResumeBlocksTool,
  });
}

export const Route = createFileRoute("/api/agentic/resume-blocks/search")({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) => post(request),
      OPTIONS: agenticOptionsResponse,
    },
  },
});
