import "@tanstack/react-start/server-only";

import {
  authenticateApiKeyRequest,
  type ApiKeyPermissionCheck,
} from "@/lib/better-auth/api-key.server";

type ToolContext = {
  userId: string;
};

type AgenticToolRequestConfig<Input, Output> = {
  request: Request;
  permissions: ApiKeyPermissionCheck;
  parse: (raw: unknown) => Input;
  execute: (ctx: ToolContext, input: Input) => Promise<Output>;
};

export const agenticApiCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key",
};

export function agenticOptionsResponse(): Response {
  return new Response(null, { status: 204, headers: agenticApiCorsHeaders });
}

function jsonResponse(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  for (const [key, value] of Object.entries(agenticApiCorsHeaders)) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  return JSON.parse(text) as unknown;
}

export async function handleAgenticToolRequest<Input, Output>({
  request,
  permissions,
  parse,
  execute,
}: AgenticToolRequestConfig<Input, Output>): Promise<Response> {
  const auth = await authenticateApiKeyRequest(request, permissions);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = await readJsonBody(request);
    const input = parse(raw);
    const result = await execute({ userId: auth.userId }, input);
    return jsonResponse(result);
  } catch (err: unknown) {
    return jsonResponse({ error: errorMessage(err) }, { status: 400 });
  }
}
