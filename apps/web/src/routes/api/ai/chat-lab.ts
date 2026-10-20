import { chatParamsFromRequestBody, toServerSentEventsResponse } from "@tanstack/ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  chatLabRun,
  isChatLabPreset,
  type ChatLabPresetId,
} from "@/routes/_dashboard/dev/chat-lab/-utils/chat-lab-script";
import { auth } from "@/lib/auth";
import { isAllowedOrigin, jsonError, preflightResponse, withCors } from "./-utils/same-origin-cors";

const forwardedSchema = z.object({
  labPreset: z.string().optional(),
});

export const Route = createFileRoute("/api/ai/chat-lab")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!isAllowedOrigin(request)) return jsonError("Forbidden", 403);

        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) return jsonError("Unauthorized", 401);

        try {
          const raw: unknown = await request.json();
          const params = await chatParamsFromRequestBody(raw);
          const data = forwardedSchema.parse(params.forwardedProps ?? {});
          const preset: ChatLabPresetId =
            data.labPreset && isChatLabPreset(data.labPreset) ? data.labPreset : "markdown";

          const stream = chatLabRun({
            preset,
            messages: params.messages,
            threadId: params.threadId,
            signal: request.signal,
          });

          return withCors(toServerSentEventsResponse(stream));
        } catch (error: unknown) {
          const message =
            error instanceof z.ZodError
              ? "Invalid chat lab payload"
              : error instanceof Error
                ? error.message
                : "Unable to process chat lab request";
          return jsonError(message, 400);
        }
      },
      OPTIONS: async () => preflightResponse(),
    },
  },
});
