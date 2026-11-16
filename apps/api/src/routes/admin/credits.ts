import { requireAdmin } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  adminAdjustCredits,
  adminGrantCredits,
} from "../credits/wallet";
import {
  adjustInput,
  grantInput,
  handleWalletError,
  readAdminUserCredits,
  userCreditsQuery,
} from "./credit-shared";

export const creditsAdminRoute = new Hono<AppEnv>()
  .post(
    "/grant",
    requireAdmin,
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
      const { userId, amount, reason } = c.req.valid("json");
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
  )
  .post(
    "/adjust",
    requireAdmin,
    zValidator("json", adjustInput, (result, c) => {
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
      const { userId, bucket, amount, reason } = c.req.valid("json");
      const session = c.get("session");
      const log = c.get("log");

      try {
        const wallet = await adminAdjustCredits({
          userId,
          bucket,
          amount,
          reason,
          adminUserId: session.user.id,
        });
        log.audit({
          action: "credits.admin_adjust",
          actor: { type: "user", id: session.user.id, email: session.user.email },
          target: { type: "credit_wallet", id: userId },
          outcome: "success",
          changes: {
            after: {
              bucket,
              amount,
              reason,
              monthly: wallet.monthlyBalance,
              bonus: wallet.bonusBalance,
            },
          },
        });
        return c.json({ wallet });
      } catch (error) {
        return handleWalletError(c, error, "credits.admin_adjust", userId);
      }
    },
  )
  /**
   * Admin view of one user's wallet and ledger. Read-only: allocation stays
   * lazy on the user's own reads.
   */
  .get(
    "/user/:userId",
    requireAdmin,
    zValidator(
      "param",
      z.object({ userId: z.string().min(1).max(64) }),
      (result, c) => {
        if (!result.success) {
          return c.json(errorBody({ message: "Invalid user id", code: "VALIDATION_ERROR" }), 400);
        }
      },
    ),
    zValidator("query", userCreditsQuery, (result, c) => {
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

      const page_ = await readAdminUserCredits({ userId, page, perPage });
      if (!page_) {
        return c.json(errorBody({ message: "User not found", code: "NOT_FOUND" }), 404);
      }
      return c.json(page_);
    },
  );
