import { requireSession } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import { ensureMonthlyAllocation, periodKeyOf } from "@api/modules/wallet";
import type { AppEnv } from "@api/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { readLedger } from "./ledger";

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

/** The viewer's credit ledger (collection of balance-change rows). */
export const creditsRoute = new Hono<AppEnv>().get(
  "/",
  requireSession,
  zValidator("query", listQuery, (result, c) => {
    if (!result.success) {
      return c.json(
        errorBody({
          message: "Invalid query",
          code: "VALIDATION_ERROR",
          issues: result.error.issues,
        }),
        400,
      );
    }
  }),
  async (c) => {
    const session = c.get("session");
    const { page, perPage } = c.req.valid("query");
    await ensureMonthlyAllocation({ userId: session.user.id });
    const ledger = await readLedger({ userId: session.user.id, page, perPage });
    return c.json({ ...ledger, periodKey: periodKeyOf(new Date()) });
  },
);
