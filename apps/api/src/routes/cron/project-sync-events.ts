import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";
import { Hono } from "hono";
import { env } from "@api/env";
import { projectUnappliedSyncEvents } from "@api/modules/sync/server/project-legacy.server";

function isAuthorized(request: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? request.headers.get("x-cron-secret") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : header;
  return token === secret;
}

export const projectSyncEventsRoute = new Hono<AppEnv>().on(["GET", "POST"], "/", async (c) => {
  if (!env.CRON_SECRET) {
    return c.json(errorBody({ message: "CRON_SECRET is not configured", code: "NOT_CONFIGURED" }), 503);
  }
  if (!isAuthorized(c.req.raw)) {
    return c.json(errorBody({ message: "Unauthorized", code: "UNAUTHORIZED" }), 401);
  }
  const result = await projectUnappliedSyncEvents(500);
  return c.json(result);
});
