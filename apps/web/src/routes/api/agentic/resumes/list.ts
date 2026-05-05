import {
  agenticOptionsResponse,
  handleAgenticToolRequest,
} from "@/features/agentic-tools/resume-api.server";
import { listResumesToolInputSchema } from "@/features/agentic-tools/resume-tool-schemas";
import { listResumesTool } from "@/features/agentic-tools/resume-tools.server";
import { createFileRoute } from "@tanstack/react-router";

async function post(request: Request): Promise<Response> {
  return handleAgenticToolRequest({
    request,
    permissions: { resumes: ["read"] },
    parse: (raw) => listResumesToolInputSchema.parse(raw),
    execute: listResumesTool,
  });
}

export const Route = createFileRoute("/api/agentic/resumes/list")({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) => post(request),
      OPTIONS: agenticOptionsResponse,
    },
  },
});
