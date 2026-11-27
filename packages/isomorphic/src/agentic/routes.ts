export const agenticOpenApiBasePath = "/api/agentic";
export const agenticOpenApiSpecPath = "/api/agentic/openapi/json";
export const agenticOpenApiUiPath = "/api/agentic/openapi";
export const agenticRpcBasePath = "/api/agentic/rpc";

export const aiBasePath = "/api/ai";
export const aiChatLabPath = "/api/ai/chat-lab";
export const aiDashboardAssistantPath = "/api/ai/dashboard-assistant";
export const aiEventSourcedResumeTailorPath = "/api/ai/event-sourced-resume-tailor";

export const agenticCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Last-Event-ID, x-api-key",
  "Access-Control-Expose-Headers": "WWW-Authenticate",
} as const;
