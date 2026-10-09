import { agenticCorsHeaders } from "@/features/agentic-tools/agentic-routes";
import type { RemoteToolContext } from "@/features/agentic-tools/definitions/tool-context";
import { resumeMcpServer } from "@/features/agentic-tools/resume-mcp.server";
import { authenticateApiKeyRequest } from "@/lib/better-auth/api-key.server";
import { createFileRoute } from "@tanstack/react-router";

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(agenticCorsHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function mcpHandler(request: Request): Promise<Response> {
  const authResult = await authenticateApiKeyRequest(request, { resumes: ["read", "write"] });

  if (!authResult) {
    return withCors(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": 'Bearer realm="api-key"',
        },
      }),
    );
  }

  const context = { userId: authResult.userId } satisfies RemoteToolContext;
  const response = await resumeMcpServer.handle(request, { context });
  return withCors(response);
}

const optionsHandler = async () => new Response(null, { status: 204, headers: agenticCorsHeaders });

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => mcpHandler(request),
      POST: async ({ request }: { request: Request }) => mcpHandler(request),
      DELETE: async ({ request }: { request: Request }) => mcpHandler(request),
      OPTIONS: optionsHandler,
    },
  },
});
