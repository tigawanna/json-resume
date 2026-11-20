import { requireSession } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import { MeService } from "@api/modules/me/me.service";
import { updateMeInput } from "@api/modules/me/schema";
import type { AppEnv } from "@api/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

function createMeRoutes({ me }: { me: MeService }) {
  return new Hono<AppEnv>()
    .get("/", requireSession, (c) => c.json(me.profile({ session: c.get("session") })))
    .delete("/", requireSession, async (c) => {
      const result = await me.deleteAccount({
        session: c.get("session"),
        headers: c.req.raw.headers,
      });
      return c.json(result);
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
        const updated = await me.updateName({ name, headers: c.req.raw.headers });
        if (!updated.ok) {
          return c.json(
            errorBody({ message: "Failed to reload session", code: "INTERNAL_ERROR" }),
            500,
          );
        }
        return c.json({ user: updated.user });
      },
    );
}

export class MeController {
  static readonly inject = { me: MeService };

  constructor({ me }: { me: MeService }) {
    this.routes = createMeRoutes({ me });
  }

  readonly routes: ReturnType<typeof createMeRoutes>;
}
