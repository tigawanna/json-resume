import { agenticCorsHeaders } from "@/features/agentic-tools/agentic-routes";
import { createResumeMcpServer } from "@/features/agentic-tools/resume-mcp.server";
import { serverEnv } from "@/lib/server-env";
import { mcpHandler as oauthMcpHandler } from "@better-auth/oauth-provider";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
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

function getUserId(jwt: { sub?: unknown }): string {
  if (typeof jwt.sub !== "string" || jwt.sub.length === 0) {
    throw new Error("OAuth access token is missing a user subject");
  }
  return jwt.sub;
}

const authenticatedMcpHandler = oauthMcpHandler(
  {
    jwksUrl: `${serverEnv.FRONTEND_URL}/api/auth/jwks`,
    verifyOptions: {
      issuer: serverEnv.FRONTEND_URL,
      audience: serverEnv.FRONTEND_URL,
    },
  },
  async (request, jwt) => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    const server = createResumeMcpServer(getUserId(jwt));

    await server.connect(transport);
    return transport.handleRequest(request);
  },
);

async function mcpHandler(request: Request): Promise<Response> {
  return withCors(await authenticatedMcpHandler(request));
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
