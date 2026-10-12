import { serverEnv } from "@/lib/server-env";

export const corsHeaders = {
  "Access-Control-Allow-Origin": serverEnv.FRONTEND_URL,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
} as const;

export function isAllowedOrigin(request: Request): boolean {
  return request.headers.get("origin") === serverEnv.FRONTEND_URL;
}

export function withCors(response: Response): Response {
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

export function jsonError(message: string, status: number) {
  return withCors(
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

export function preflightResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
