import { chatParamsFromRequestBody, toServerSentEventsResponse } from "@tanstack/ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { streamEventSourcedResumeAgentChat } from "@/routes/_dashboard/-ai/-utils/stream-resume-chat.server";
import { EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS } from "@/routes/_dashboard/-ai/-utils/system-prompt";
import { auth } from "@/lib/auth";
import { serverEnv } from "@/lib/server-env";

const forwardedSchema = z.object({
  resumeId: z.string().trim().min(1),
  activeResumeId: z.string().trim().min(1).optional(),
  jobDescription: z.string().optional(),
  systemPrompt: z.string().max(EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS).optional(),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": serverEnv.FRONTEND_URL,
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
} as const;

function isAllowedOrigin(request: Request): boolean {
  return request.headers.get("origin") === serverEnv.FRONTEND_URL;
}

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

function jsonError(message: string, status: number) {
  return withCors(
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

export const Route = createFileRoute("/api/ai/event-sourced-resume-tailor")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!isAllowedOrigin(request)) return jsonError("Forbidden", 403);

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) return jsonError("Unauthorized", 401);

        try {
          const raw: unknown = await request.json();
          const params = await chatParamsFromRequestBody(raw);
          const data = forwardedSchema.parse(params.forwardedProps);

          const stream = await streamEventSourcedResumeAgentChat({
            resumeId: data.resumeId,
            activeResumeId: data.activeResumeId,
            jobDescription: data.jobDescription,
            systemPrompt: data.systemPrompt,
            messages: params.messages as never,
            apiKey: data.apiKey,
            model: data.model,
          });

          return withCors(toServerSentEventsResponse(stream));
        } catch (error: unknown) {
          const message =
            error instanceof z.ZodError
              ? "Invalid AI request payload"
              : error instanceof Error
                ? error.message
                : "Unable to process AI request";
          return jsonError(message, 400);
        }
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: corsHeaders,
        }),
    },
  },
});
