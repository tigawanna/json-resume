import { handleAgenticOpenApiRequest } from "@/features/agentic-tools/resume-orpc.server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/agentic/$")({
  server: {
    handlers: {
      ANY: async ({ request }: { request: Request }) => handleAgenticOpenApiRequest(request),
    },
  },
});
