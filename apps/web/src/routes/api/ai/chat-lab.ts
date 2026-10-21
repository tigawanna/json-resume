import { chatParamsFromRequestBody, toServerSentEventsResponse } from "@tanstack/ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  chatLabRun,
  isChatLabPreset,
  type ChatLabPresetId,
} from "@/routes/_dashboard/dev/chat-lab/-utils/chat-lab-script";
import { isAllowedOrigin, jsonError, preflightResponse, withCors } from "./-utils/same-origin-cors";

const forwardedSchema = z.object({
  labPreset: z.string().optional(),
  resumeId: z.string().optional(),
});

export const Route = createFileRoute("/api/ai/chat-lab")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!import.meta.env.DEV) return jsonError("Not found", 404);
        if (!isAllowedOrigin(request))
          return jsonError("Chat lab is only available from this app.", 400);

        try {
          const raw: unknown = await request.json();
          const params = await chatParamsFromRequestBody(raw);
          const data = forwardedSchema.parse(params.forwardedProps ?? {});
          const preset: ChatLabPresetId =
            data.labPreset && isChatLabPreset(data.labPreset) ? data.labPreset : "jd-draft";

          const stream = chatLabRun({
            preset,
            messages: params.messages,
            threadId: params.threadId,
            resumeId: data.resumeId,
            signal: request.signal,
          });

          return withCors(toServerSentEventsResponse(stream));
        } catch (error: unknown) {
          let message = "Unable to process chat lab request";
          if (error instanceof z.ZodError) message = "Invalid chat lab payload";
          else if (error instanceof Error) message = error.message;
          return jsonError(message, 400);
        }
      },
      OPTIONS: async () => preflightResponse(),
    },
  },
});
