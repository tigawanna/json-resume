import { chatParamsFromRequestBody, toServerSentEventsResponse } from "@tanstack/ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { streamDashboardAgentChat } from "@/routes/_dashboard/-ai/-utils/stream-dashboard-chat.server";
import { aiRoutingSchema } from "@/lib/openrouter/routing";
import { QUERY_COLLECTIONS } from "@/features/agentic-tools/assistant-data-tool-schemas";
import { ASSISTANT_SKILL_INSTRUCTIONS_MAX } from "@/data-access-layer/event-sourced/rows/assistant-skill-rows";
import { resolveHostedAiUserId } from "./-utils/hosted-ai-session";
import { isAllowedOrigin, jsonError, preflightResponse, withCors } from "./-utils/same-origin-cors";

const forwardedSchema = z.object({
  /** The user's local date, so "this month" matches their calendar. */
  today: z.iso.date(),
  slopGuard: z.boolean().optional(),
  skillInstructions: z.string().max(ASSISTANT_SKILL_INSTRUCTIONS_MAX).optional(),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
  routing: aiRoutingSchema.optional(),
  conversationId: z.string().optional(),
  page: z.object({
    routeId: z.string(),
    pathname: z.string(),
    label: z.string(),
    summary: z.string(),
    instructions: z.string(),
    toolPack: z.enum(["library", "experience", "job", "resume-list", "cover-letter", "none"]),
    params: z.record(z.string(), z.string()),
    focus: z
      .object({
        collection: z.enum(QUERY_COLLECTIONS),
        id: z.string(),
        title: z.string(),
      })
      .nullable(),
    conversationStartedOn: z.string(),
    experienceSnapshot: z.string().max(50_000).optional(),
  }),
});

export const Route = createFileRoute("/api/ai/dashboard-assistant")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!isAllowedOrigin(request)) return jsonError("Forbidden", 403);

        const userId = await resolveHostedAiUserId(request);
        if (typeof userId !== "string") return userId;

        try {
          const raw: unknown = await request.json();
          const params = await chatParamsFromRequestBody(raw);
          const data = forwardedSchema.parse(params.forwardedProps);

          const stream = await streamDashboardAgentChat({
            today: data.today,
            slopGuard: data.slopGuard,
            skillInstructions: data.skillInstructions,
            messages: params.messages,
            threadId: params.threadId,
            runId: params.runId,
            parentRunId: params.parentRunId,
            resume: params.resume,
            apiKey: data.apiKey,
            model: data.model,
            routing: data.routing,
            userId,
            page: data.page,
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
