import { auth } from "@/lib/auth";
import { createMcpServerForUser } from "@/lib/mcp/mcp-server.server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createFileRoute } from "@tanstack/react-router";

async function handleMcpRequest({ request }: { request: Request }): Promise<Response> {
  const session = await auth.api.getMcpSession({
    headers: request.headers,
  });

  if (!session?.userId) {
    return new Response(null, { status: 401 });
  }

  const server = createMcpServerForUser(session.userId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
    await server.close();
  }
}

export const Route = createFileRoute("/api/mcp/$")({
  server: {
    handlers: {
      GET: handleMcpRequest,
      POST: handleMcpRequest,
      DELETE: handleMcpRequest,
    },
  },
});
