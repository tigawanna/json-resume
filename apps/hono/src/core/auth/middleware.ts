import { errorBody } from "@hono-api/lib/http";
import type { AppEnv } from "@hono-api/types";
import { createMiddleware } from "hono/factory";
import type { AuthService } from "./auth.service";

type SessionAuth = Pick<AuthService, "getSession">;

export function requireSession({ auth }: { auth: SessionAuth }) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const session = await auth.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json(errorBody({ message: "Unauthorized", code: "UNAUTHORIZED" }), 401);
    }
    c.set("session", session);
    await next();
  });
}

export function requireAdmin({ auth }: { auth: SessionAuth }) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const existing = c.get("session");
    const session = existing ?? (await auth.getSession({ headers: c.req.raw.headers }));
    if (!session) {
      return c.json(errorBody({ message: "Unauthorized", code: "UNAUTHORIZED" }), 401);
    }
    if (session.user.role !== "admin") {
      return c.json(errorBody({ message: "Admin access required", code: "FORBIDDEN" }), 403);
    }
    c.set("session", session);
    await next();
  });
}
