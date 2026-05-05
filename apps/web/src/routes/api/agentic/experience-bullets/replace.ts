import {
  agenticOptionsResponse,
  handleAgenticToolRequest,
} from "@/features/agentic-tools/resume-api.server";
import { replaceExperienceBulletsToolInputSchema } from "@/features/agentic-tools/resume-tool-schemas";
import { replaceExperienceBulletsTool } from "@/features/agentic-tools/resume-tools.server";
import { createFileRoute } from "@tanstack/react-router";

async function post(request: Request): Promise<Response> {
  return handleAgenticToolRequest({
    request,
    permissions: { resumes: ["write"] },
    parse: (raw) => replaceExperienceBulletsToolInputSchema.parse(raw),
    execute: replaceExperienceBulletsTool,
  });
}

export const Route = createFileRoute("/api/agentic/experience-bullets/replace")({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) => post(request),
      OPTIONS: agenticOptionsResponse,
    },
  },
});
