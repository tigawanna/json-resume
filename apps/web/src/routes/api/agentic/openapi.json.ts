import { agenticCorsHeaders } from "@/features/agentic-tools/agentic-routes";
import { getAgenticOpenApiSpec } from "@/features/agentic-tools/resume-orpc.server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/agentic/openapi/json")({
  server: {
    handlers: {
      GET: async () => {
        const spec = await getAgenticOpenApiSpec();

        return new Response(JSON.stringify(spec, null, 2), {
          status: 200,
          headers: {
            ...agenticCorsHeaders,
            "Content-Type": "application/json",
          },
        });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: agenticCorsHeaders,
        }),
    },
  },
});
