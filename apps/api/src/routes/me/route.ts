import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { auth } from "@api/auth/auth";
import { requireSession } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";

export const updateMeInput = z.object({
  name: z.string().trim().min(1).max(120),
});

/**
 * Signed-in profile. Demonstrates the route-level mutation pattern:
 * `requireSession` + `zValidator` + a typed `c.req.valid()` body.
 */
export const meRoute = new Hono<AppEnv>()
  .get("/", requireSession, (c) => {
    const session = c.get("session");
    return c.json({ user: session.user });
  })
  .patch(
    "/",
    requireSession,
    zValidator("json", updateMeInput, (result, c) => {
      if (!result.success) {
        return c.json(
          errorBody({
            message: "Invalid request body",
            code: "VALIDATION_ERROR",
            issues: result.error.issues,
          }),
          400,
        );
      }
    }),
    async (c) => {
      const { name } = c.req.valid("json");
      const headers = c.req.raw.headers;

      await auth.api.updateUser({ body: { name }, headers });
      const updated = await auth.api.getSession({ headers });
      if (!updated) {
        return c.json(
          errorBody({ message: "Failed to reload session", code: "INTERNAL_ERROR" }),
          500,
        );
      }

      return c.json({ user: updated.user });
    },
  );
