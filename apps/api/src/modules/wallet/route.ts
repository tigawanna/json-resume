import { requireSession } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";
import { zValidator } from "@hono/zod-validator";
import { CREDIT_POLICY } from "@repo/isomorphic/credits-policy";
import { Hono } from "hono";
import { z } from "zod";
import { ensureMonthlyAllocation } from "./allocation";
import { hasJoinedWaitlist } from "./eligibility";
import { nextResetAt } from "./period";

const checkInput = z.object({
  action: z.enum(["create", "clone", "import", "tailor"]),
});

/**
 * The viewer's wallet. GET allocates the current month lazily (no cron).
 * POST /checks is a pre-flight that never spends.
 */
export const walletRoute = new Hono<AppEnv>()
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
  .post(
    "/checks",
    requireSession,
    zValidator("json", checkInput, (result, c) => {
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
      const session = c.get("session");
      const { action } = c.req.valid("json");
      const { wallet } = await ensureMonthlyAllocation({ userId: session.user.id });
      const available = wallet.monthlyBalance + wallet.bonusBalance;
      if (available < CREDIT_POLICY.resumeCost) {
        c.get("log").set({
          credits: { denied: true, action, available, required: CREDIT_POLICY.resumeCost },
        });
      }
      return c.json({
        available,
        monthly: wallet.monthlyBalance,
        bonus: wallet.bonusBalance,
        resetsAt: nextResetAt(new Date()).toISOString(),
      });
    },
  );
