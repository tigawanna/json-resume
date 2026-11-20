import { requireAdmin } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import { adminGrantCredits } from "@api/modules/credits";
import type { AppEnv } from "@api/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { handleWalletError } from "./handle-error";
import { readAdminWalletCredits } from "./read";
import { grantInput, ledgerQuery, userIdParam } from "./schema";

/** Nested credit collection: `GET|POST /admin/wallets/:userId/credits`. */
export const walletCreditsRoute = new Hono<AppEnv>()
  .get(
    "/:userId/credits",
    requireAdmin,
    zValidator("param", userIdParam, (result, c) => {
      if (!result.success) {
        return c.json(errorBody({ message: "Invalid user id", code: "VALIDATION_ERROR" }), 400);
      }
    }),
    zValidator("query", ledgerQuery, (result, c) => {
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
      const { userId } = c.req.valid("param");
      const { page, perPage } = c.req.valid("query");
      const ledger = await readAdminWalletCredits({ userId, page, perPage });
      if (!ledger) {
        return c.json(errorBody({ message: "User not found", code: "NOT_FOUND" }), 404);
      }
      return c.json(ledger);
    },
  )
  .post(
    "/:userId/credits",
    requireAdmin,
    zValidator("param", userIdParam, (result, c) => {
      if (!result.success) {
        return c.json(errorBody({ message: "Invalid user id", code: "VALIDATION_ERROR" }), 400);
      }
    }),
    zValidator("json", grantInput, (result, c) => {
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
      const { userId } = c.req.valid("param");
      const { amount, reason } = c.req.valid("json");
      const session = c.get("session");
      const log = c.get("log");

      try {
        const wallet = await adminGrantCredits({
          userId,
          amount,
          reason,
          adminUserId: session.user.id,
        });
        log.audit({
          action: "credits.admin_grant",
          actor: { type: "user", id: session.user.id, email: session.user.email },
          target: { type: "credit_wallet", id: userId },
          outcome: "success",
          changes: { after: { bonusBalance: wallet.bonusBalance, amount, reason } },
        });
        return c.json({ wallet });
      } catch (error) {
        return handleWalletError(c, error, "credits.admin_grant", userId);
      }
    },
  );
