import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  outboundEventBatchSchema,
  pullSyncEvents,
  pushSyncEvents,
} from "@/modules/sync/server/sync-events.server";
import type { OutboundEvent } from "event-sourced-collection";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toOutboundEvents(rows: z.infer<typeof outboundEventBatchSchema>): OutboundEvent[] {
  return rows.map((event) => ({
    eventId: event.eventId,
    collectionId: event.collectionId,
    type: event.type,
    key: event.key,
    payload: event.payload,
    previous: event.previous ?? null,
    txId: event.txId,
    clientId: event.clientId,
    schemaVersion: event.schemaVersion,
    timestamp: event.timestamp,
    baseVersion: event.baseVersion ?? null,
  }));
}

async function requireSessionUserId(
  request: Request,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return { ok: false, response: json({ error: "Unauthorized" }, 401) };
  }
  return { ok: true, userId: session.user.id };
}

export const Route = createFileRoute("/api/sync/events")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const authResult = await requireSessionUserId(request);
        if (!authResult.ok) return authResult.response;

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const parsed = outboundEventBatchSchema.safeParse(raw);
        if (!parsed.success) {
          return json({ error: "Invalid event batch", issues: parsed.error.issues }, 400);
        }

        const result = await pushSyncEvents(authResult.userId, toOutboundEvents(parsed.data));
        return json(result);
      },
      GET: async ({ request }: { request: Request }) => {
        const authResult = await requireSessionUserId(request);
        if (!authResult.ok) return authResult.response;

        const url = new URL(request.url);
        const sinceRaw = url.searchParams.get("since") ?? "0";
        const since = z.coerce.number().int().min(0).catch(0).parse(sinceRaw);
        const result = await pullSyncEvents(authResult.userId, since);
        return json(result);
      },
    },
  },
});
