import { chatParamsFromRequestBody, toServerSentEventsResponse } from "@tanstack/ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { streamDashboardAgentChat } from "@/routes/_dashboard/-ai/-utils/stream-dashboard-chat.server";
import { aiRoutingSchema } from "@/features/agentic-tools/openrouter-routing";
import { auth } from "@/lib/auth";
import { isAllowedOrigin, jsonError, preflightResponse, withCors } from "./-utils/same-origin-cors";

const forwardedSchema = z.object({
  /** The user's local date, so "this month" matches their calendar. */
  today: z.iso.date(),
  slopGuard: z.boolean().optional(),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
  routing: aiRoutingSchema.optional(),
});

export const Route = createFileRoute("/api/ai/dashboard-assistant")({
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

          const stream = await streamDashboardAgentChat({
            today: data.today,
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
          const message =
            error instanceof z.ZodError
              ? "Invalid AI request payload"
              : error instanceof Error
                ? error.message
                : "Unable to process AI request";
          return jsonError(message, 400);
        }
      },
      OPTIONS: async () => preflightResponse(),
    },
  },
});
