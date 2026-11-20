import { requireAdmin } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import { adminAdjustCredits } from "@api/routes/credits";
import type { AppEnv } from "@api/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { handleWalletError } from "./handle-error";
import { readAdminWallet } from "./read";
import { adjustInput, userIdParam } from "./schema";

/** GET/PATCH `/admin/wallets/:userId`. */
export const walletResourceRoute = new Hono<AppEnv>()
  .get(
    "/:userId",
    requireAdmin,
    zValidator("param", userIdParam, (result, c) => {
      if (!result.success) {
        return c.json(errorBody({ message: "Invalid user id", code: "VALIDATION_ERROR" }), 400);
      }
    }),
    async (c) => {
      const { userId } = c.req.valid("param");
      const page_ = await readAdminWallet({ userId });
      if (!page_) {
        return c.json(errorBody({ message: "User not found", code: "NOT_FOUND" }), 404);
      }
      return c.json(page_);
    },
  )
  .patch(
    "/:userId",
    requireAdmin,
    zValidator("param", userIdParam, (result, c) => {
      if (!result.success) {
        return c.json(errorBody({ message: "Invalid user id", code: "VALIDATION_ERROR" }), 400);
      }
    }),
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
      const { userId } = c.req.valid("param");
      const { bucket, amount, reason } = c.req.valid("json");
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
  );
