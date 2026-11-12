import { chatParamsFromRequestBody, toServerSentEventsResponse } from "@tanstack/ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { streamDashboardSimpleChat } from "@/routes/_dashboard/-ai/-utils/stream-dashboard-simple-chat.server";
import { aiRoutingSchema } from "@/lib/openrouter/routing";
import { resolveHostedAiUserId } from "./-utils/hosted-ai-session";
import { isAllowedOrigin, jsonError, preflightResponse, withCors } from "./-utils/same-origin-cors";

const forwardedSchema = z.object({
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
  routing: aiRoutingSchema.optional(),
});

export const Route = createFileRoute("/api/ai/dashboard-chat")({
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
          const stream = await streamDashboardSimpleChat({
            messages: params.messages,
            threadId: params.threadId,
            runId: params.runId,
            parentRunId: params.parentRunId,
            resume: params.resume,
            apiKey: data.apiKey,
            model: data.model,
            routing: data.routing,
            userId,
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
