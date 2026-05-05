import {
  agenticOptionsResponse,
  handleAgenticToolRequest,
} from "@/features/agentic-tools/resume-api.server";
import { createResumeFromDocumentToolInputSchema } from "@/features/agentic-tools/resume-tool-schemas";
import { createResumeFromDocumentTool } from "@/features/agentic-tools/resume-tools.server";
import { createFileRoute } from "@tanstack/react-router";

async function post(request: Request): Promise<Response> {
  return handleAgenticToolRequest({
    request,
    permissions: { resumes: ["write"] },
    parse: (raw) => createResumeFromDocumentToolInputSchema.parse(raw),
    execute: createResumeFromDocumentTool,
  });
}

export const Route = createFileRoute("/api/agentic/resumes/create-from-document")({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) => post(request),
      OPTIONS: agenticOptionsResponse,
    },
  },
});
