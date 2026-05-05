import "@tanstack/react-start/server-only";

import { serverEnv } from "@/lib/server-env";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createRouterClient } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { agenticCorsHeaders, agenticOpenApiBasePath, agenticRpcBasePath } from "./agentic-routes";
import { type AgenticInitialContext } from "./resume-orpc-base.server";
import { resumeAgenticRouter } from "./resume-orpc-router.server";

export { resumeAgenticRouter, type ResumeAgenticRouter } from "./resume-orpc-router.server";

// ─── Transport handlers ───────────────────────────────────────────────────────
// Two handlers share the same router: one for typed RPC (used by internal tooling
// and the oRPC client), one for OpenAPI-compatible REST (used by Scalar and external agents).
// Both are mounted as catch-all TanStack Start routes under their respective base paths.

const rpcHandler = new RPCHandler(resumeAgenticRouter);
const openApiHandler = new OpenAPIHandler(resumeAgenticRouter);

// OpenAPI spec generator. ZodToJsonSchemaConverter bridges Zod v4 schemas to JSON Schema,
// which the generator embeds into the spec for each procedure's request/response bodies.
const openApiGenerator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

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

function agenticOptionsResponse(): Response {
  return new Response(null, { status: 204, headers: agenticCorsHeaders });
}

export async function handleAgenticRpcRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return agenticOptionsResponse();

  const { response } = await rpcHandler.handle(request, {
    prefix: agenticRpcBasePath,
    context: { headers: request.headers } satisfies AgenticInitialContext,
  });

  return withCors(response ?? new Response("Not Found", { status: 404 }));
}

export async function handleAgenticOpenApiRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return agenticOptionsResponse();

  const { matched, response } = await openApiHandler.handle(request, {
    prefix: agenticOpenApiBasePath,
    context: { headers: request.headers } satisfies AgenticInitialContext,
  });

  return withCors(response ?? new Response(matched ? null : "Not Found", { status: 404 }));
}

export async function getAgenticOpenApiSpec(): Promise<unknown> {
  return openApiGenerator.generate(resumeAgenticRouter, {
    info: { title: "Agentic JSON Resume API", version: "0.1.0" },
    // Server URL must include the base path so Scalar constructs correct request URLs.
    // Without it, generated URLs would be missing the /api/agentic prefix.
    servers: [{ url: `${serverEnv.FRONTEND_URL}${agenticOpenApiBasePath}` }],
  });
}

// ─── Server client ────────────────────────────────────────────────────────────
// Bypasses HTTP entirely — calls procedure handlers in-process. The userId is injected
// directly into context, so the API key auth middleware short-circuits without a
// network round-trip to Better Auth. Used by the MCP server and the AI agent.
export function createResumeAgenticServerClient(userId: string) {
  return createRouterClient(resumeAgenticRouter, {
    context: { userId } satisfies AgenticInitialContext,
  });
}
