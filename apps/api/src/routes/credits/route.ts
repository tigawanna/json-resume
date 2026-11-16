import { requireSession } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";
import { zValidator } from "@hono/zod-validator";
import { CREDIT_POLICY } from "@repo/isomorphic/credits-policy";
import { Hono } from "hono";
import { z } from "zod";
import {
  ensureMonthlyAllocation,
  hasJoinedWaitlist,
  nextResetAt,
  periodKeyOf,
  readLedger,
} from "./wallet";

const ledgerQueryInput = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * The viewer's credit wallet. Reading it lazily allocates the current month
 * (plan §1.4): no cron, the first read or spend of a month does the grant.
 */
export const creditsRoute = new Hono<AppEnv>()
  .get("/", requireSession, async (c) => {
    const session = c.get("session");
    const { wallet } = await ensureMonthlyAllocation({ userId: session.user.id });
    const waitlistJoined = await hasJoinedWaitlist(session.user.id);

    return c.json({
      monthly: wallet.monthlyBalance,
      bonus: wallet.bonusBalance,
      available: wallet.monthlyBalance + wallet.bonusBalance,
      monthlyPeriodKey: wallet.monthlyPeriodKey,
      resetsAt: nextResetAt(new Date()).toISOString(),
      waitlistJoined,
      policy: CREDIT_POLICY,
    });
  })
  /**
   * The viewer's ledger. Same read-allocation semantics as the wallet.
   */
  .get(
    "/ledger",
    requireSession,
    zValidator("query", ledgerQueryInput, (result, c) => {
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
