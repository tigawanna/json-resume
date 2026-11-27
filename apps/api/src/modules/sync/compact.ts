import { requireSession } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { compactOnServer } from "@api/modules/sync/server/compaction/compaction.server";
import { compactionProposalSchema } from "@repo/api-contracts/sync/compaction";

export const syncCompactRoute = new Hono<AppEnv>().post(
  "/",
  requireSession,
  zValidator("json", compactionProposalSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        errorBody({
          message: "Invalid compaction proposal",
          code: "VALIDATION_ERROR",
          issues: result.error.issues,
        }),
        400,
      );
    }
  }),
  async (c) => {
    const session = c.get("session");
    const proposal = c.req.valid("json");
    await compactOnServer({ userId: session.user.id, proposal });
    return c.json({ ok: true });
  },
);
