import {
  agenticOptionsResponse,
  handleAgenticToolRequest,
} from "@/features/agentic-tools/resume-api.server";
import { getResumeDocumentToolInputSchema } from "@/features/agentic-tools/resume-tool-schemas";
import { getResumeDocumentTool } from "@/features/agentic-tools/resume-tools.server";
import { createFileRoute } from "@tanstack/react-router";

async function post(request: Request): Promise<Response> {
  return handleAgenticToolRequest({
    request,
    permissions: { resumes: ["read"] },
    parse: (raw) => getResumeDocumentToolInputSchema.parse(raw),
    execute: getResumeDocumentTool,
  });
}

export const Route = createFileRoute("/api/agentic/resumes/document")({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) => post(request),
      OPTIONS: agenticOptionsResponse,
    },
  },
});
