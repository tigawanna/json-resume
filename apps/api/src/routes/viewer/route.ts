import { Hono } from "hono";
import { requireSession } from "@api/auth/middleware";
import type { AppEnv } from "@api/types";

/**
 * Current Better Auth session.
 * Migrated from the `getSession` server function in `apps/web`.
 */
export const viewerRoute = new Hono<AppEnv>().get("/", requireSession, (c) => {
  const session = c.get("session");
  return c.json({
    user: session.user,
    session: session.session,
  });
});
