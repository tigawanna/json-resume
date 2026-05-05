export const agenticOpenApiBasePath = "/api/agentic";
export const agenticOpenApiSpecPath = "/api/agentic/openapi/json";
export const agenticRpcBasePath = "/api/agentic/rpc";
export const agenticMcpPath = "/api/mcp";

export const agenticCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Last-Event-ID, mcp-protocol-version, mcp-session-id, x-api-key",
  "Access-Control-Expose-Headers": "WWW-Authenticate, mcp-protocol-version, mcp-session-id",
} as const;
