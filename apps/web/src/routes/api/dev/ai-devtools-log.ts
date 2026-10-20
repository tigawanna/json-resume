import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { appendAiDevtoolsRecords } from "@/lib/tanstack/devtools/ai-devtools-log.server";

const bodySchema = z.object({
  records: z
    .array(
      z.object({
        source: z.enum(["client", "fps"]).default("client"),
        type: z.string(),
        at: z.number(),
        event: z.unknown(),
      }),
    )
    .max(200),
});

export const Route = createFileRoute("/api/dev/ai-devtools-log")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!import.meta.env.DEV) return new Response(null, { status: 404 });

        try {
          const raw: unknown = JSON.parse(await request.text());
          const body = bodySchema.parse(raw);
          appendAiDevtoolsRecords(
            body.records.map((record) => ({
              source: record.source,
              type: record.type,
              at: record.at,
              event: record.event,
            })),
          );
          return new Response(null, { status: 204 });
        } catch (error: unknown) {
          const message = error instanceof z.ZodError ? "Invalid AI devtools log" : "Bad request";
          return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
