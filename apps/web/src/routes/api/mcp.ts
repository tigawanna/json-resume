import { createResumeMcpServer } from "@/features/agentic-tools/resume-mcp.server";
import { auth } from "@/lib/auth";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createFileRoute } from "@tanstack/react-router";
import { withMcpAuth } from "better-auth/plugins";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Last-Event-ID, mcp-protocol-version, mcp-session-id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, mcp-protocol-version, mcp-session-id",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const authenticatedMcpHandler = withMcpAuth(auth, async (request, session) => {
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  const server = createResumeMcpServer(session.userId);

  await server.connect(transport);
  return transport.handleRequest(request);
});

async function mcpHandler(request: Request): Promise<Response> {
  return withCors(await authenticatedMcpHandler(request));
}

const optionsHandler = async () => new Response(null, { status: 204, headers: corsHeaders });

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
