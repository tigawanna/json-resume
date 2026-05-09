import { toServerSentEventsResponse, type ModelMessage } from "@tanstack/ai";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { streamResumeAgentChat } from "@/features/agentic-tools/resume-agent.server";
import { agenticCorsHeaders } from "@/features/agentic-tools/agentic-routes";
import { auth } from "@/lib/auth";

const resumeAiRequestDataSchema = z.object({
  resumeId: z.string().trim().min(1),
  jobDescription: z.string().optional(),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
});

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(agenticCorsHeaders)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const Route = createFileRoute("/api/ai/resume-tailor")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return withCors(
            new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }

        try {
          const raw = (await request.json()) as {
            messages?: unknown;
            data?: unknown;
          };

          if (!Array.isArray(raw.messages)) {
            return withCors(
              new Response(JSON.stringify({ error: "Invalid chat payload" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }),
            );
          }

          const data = resumeAiRequestDataSchema.parse(raw.data);
          const stream = await streamResumeAgentChat({
            userId: session.user.id,
            resumeId: data.resumeId,
            jobDescription: data.jobDescription,
            messages: raw.messages as ModelMessage[],
            apiKey: data.apiKey,
            model: data.model,
          });

          return withCors(toServerSentEventsResponse(stream));
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "An unexpected error occurred";

          return withCors(
            new Response(JSON.stringify({ error: message }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: agenticCorsHeaders,
        }),
    },
  },
});
