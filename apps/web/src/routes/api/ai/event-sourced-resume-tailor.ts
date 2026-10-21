import { chatParamsFromRequestBody, toServerSentEventsResponse } from "@tanstack/ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { streamEventSourcedResumeAgentChat } from "@/routes/_dashboard/-ai/-utils/stream-resume-chat.server";
import { EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS } from "@/routes/_dashboard/-ai/-utils/system-prompt";
import { aiRoutingSchema } from "@/lib/openrouter/routing";
import { auth } from "@/lib/auth";
import { isAllowedOrigin, jsonError, preflightResponse, withCors } from "./-utils/same-origin-cors";

const forwardedSchema = z.object({
  resumeId: z.string().trim().min(1),
  /** Null when the user detached the résumé from the conversation. */
  activeResumeId: z.string().trim().min(1).nullable().optional(),
  activeJobId: z.string().trim().min(1).optional(),
  activeJobLabel: z.string().trim().max(400).optional(),
  systemPrompt: z.string().max(EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS).optional(),
  slopGuard: z.boolean().optional(),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
  routing: aiRoutingSchema.optional(),
});

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
            activeJob: data.activeJobId
              ? { id: data.activeJobId, label: data.activeJobLabel ?? "" }
              : undefined,
            systemPrompt: data.systemPrompt,
            slopGuard: data.slopGuard,
            messages: params.messages,
            threadId: params.threadId,
            runId: params.runId,
            parentRunId: params.parentRunId,
            resume: params.resume,
            apiKey: data.apiKey,
            model: data.model,
            routing: data.routing,
            userId: session.user.id,
          });

          return withCors(toServerSentEventsResponse(stream));
        } catch (error: unknown) {
          let message = "Unable to process AI request";
          if (error instanceof z.ZodError) message = "Invalid AI request payload";
          else if (error instanceof Error) message = error.message;
          return jsonError(message, 400);
        }
      },
      OPTIONS: async () => preflightResponse(),
    },
  },
});
