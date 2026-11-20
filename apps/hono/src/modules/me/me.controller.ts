import { AuthService } from "@hono-api/core/auth/auth.service";
import { requireSession } from "@hono-api/core/auth/middleware";
import { errorBody } from "@hono-api/lib/http";
import type { AppEnv } from "@hono-api/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { updateMeInput } from "./me.dto";
import { MeService } from "./me.service";

export class MeController {
  constructor({ me, auth }: { me: MeService; auth: AuthService }) {
    this.me = me;
    this.requireSession = requireSession({ auth });
  }

  readonly me: MeService;
  readonly requireSession: ReturnType<typeof requireSession>;

  readonly routes = new Hono<AppEnv>()
    .get("/", (c, next) => this.requireSession(c, next), (c) =>
      c.json(this.me.profile({ session: c.get("session") })),
    )
    .delete("/", (c, next) => this.requireSession(c, next), async (c) => {
      const result = await this.me.deleteAccount({
        session: c.get("session"),
        headers: c.req.raw.headers,
      });
      return c.json(result);
    })
    .patch(
      "/",
      (c, next) => this.requireSession(c, next),
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
        const updated = await this.me.updateName({ name, headers: c.req.raw.headers });
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
