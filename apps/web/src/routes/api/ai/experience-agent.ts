import { chatParamsFromRequestBody, toServerSentEventsResponse } from "@tanstack/ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { experienceGroupSnapshotSchema } from "@/features/agentic-tools/experience-snapshot";
import { ASSISTANT_SKILL_INSTRUCTIONS_MAX } from "@/data-access-layer/event-sourced/rows/assistant-skill-rows";
import { streamExperienceAgentChat } from "@/routes/_dashboard/-ai/-utils/stream-experience-chat.server";
import { aiRoutingSchema } from "@/lib/openrouter/routing";
import { resolveHostedAiUserId } from "./-utils/hosted-ai-session";
import { isAllowedOrigin, jsonError, preflightResponse, withCors } from "./-utils/same-origin-cors";

const forwardedSchema = z.object({
  /** Titles and bullets of the open company + period group, capped by the client. */
  snapshot: experienceGroupSnapshotSchema,
  skillInstructions: z.string().max(ASSISTANT_SKILL_INSTRUCTIONS_MAX).optional(),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
  routing: aiRoutingSchema.optional(),
});

export const Route = createFileRoute("/api/ai/experience-agent")({
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

          const stream = await streamExperienceAgentChat({
            snapshot: data.snapshot,
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
