import { createMiddleware } from "hono/factory";
import { auth, type AuthSession } from "@api/auth/auth";
import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";

async function readSession(headers: Headers): Promise<AuthSession | null> {
  return auth.api.getSession({ headers });
}

/**
 * Resolves the Better Auth session and puts it on the context. Chain it on any
 * route that needs a signed-in user: `.get("/", requireSession, handler)`.
 */
export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const session = await readSession(c.req.raw.headers);
  if (!session) {
    return c.json(errorBody({ message: "Unauthorized", code: "UNAUTHORIZED" }), 401);
  }
  c.set("session", session);
  await next();
});

/** Signed-in user with the `admin` role. Includes the session check. */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const session = await readSession(c.req.raw.headers);
  if (!session) {
    return c.json(errorBody({ message: "Unauthorized", code: "UNAUTHORIZED" }), 401);
  }
  if (session.user.role !== "admin") {
    return c.json(errorBody({ message: "Admin access required", code: "FORBIDDEN" }), 403);
  }
  c.set("session", session);
  await next();
});
