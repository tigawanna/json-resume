import {
  agenticOptionsResponse,
  handleAgenticToolRequest,
} from "@/features/agentic-tools/resume-api.server";
import { addExperienceBulletToolInputSchema } from "@/features/agentic-tools/resume-tool-schemas";
import { addExperienceBulletTool } from "@/features/agentic-tools/resume-tools.server";
import { createFileRoute } from "@tanstack/react-router";

async function post(request: Request): Promise<Response> {
  return handleAgenticToolRequest({
    request,
    permissions: { resumes: ["write"] },
    parse: (raw) => addExperienceBulletToolInputSchema.parse(raw),
    execute: addExperienceBulletTool,
  });
}

export const Route = createFileRoute("/api/agentic/experience-bullets/add")({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) => post(request),
      OPTIONS: agenticOptionsResponse,
    },
  },
});
