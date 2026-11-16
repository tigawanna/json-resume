import { requireSession } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  outboundEventBatchSchema,
  pullSyncEvents,
  pushSyncEvents,
} from "@api/modules/sync/server/sync-events.server";
import type { OutboundEvent } from "event-sourced-collection";

const toOutboundEvents = (rows: z.infer<typeof outboundEventBatchSchema>): OutboundEvent[] =>
  rows.map((event) => ({
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

export const syncEventsRoute = new Hono<AppEnv>()
  .post(
    "/",
    requireSession,
    zValidator("json", outboundEventBatchSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          errorBody({
            message: "Invalid event batch",
            code: "VALIDATION_ERROR",
            issues: result.error.issues,
          }),
          400,
        );
      }
    }),
    async (c) => {
      const session = c.get("session");
      const parsed = c.req.valid("json");
      const result = await pushSyncEvents(session.user.id, toOutboundEvents(parsed));
      return c.json(result);
    },
  )
  .get("/", requireSession, async (c) => {
    const session = c.get("session");
    const sinceRaw = c.req.query("since") ?? "0";
    const since = z.coerce.number().int().min(0).catch(0).parse(sinceRaw);
    const result = await pullSyncEvents(session.user.id, since);
    return c.json(result);
  });
