import { requireAdmin } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";
import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/client";
import { user } from "@repo/db/schema/auth-schema";
import {
  AdjustmentBelowZeroError,
  BannedUserError,
  UnknownUserError,
  adminAdjustCredits,
  adminGrantCredits,
  readLedger,
} from "../credits/wallet";

const grantInput = z.object({
  userId: z.string().min(1).max(64),
  amount: z.number().int().min(1).max(10_000),
  reason: z.string().trim().min(1).max(500),
});

const adjustInput = z.object({
  userId: z.string().min(1).max(64),
  bucket: z.enum(["monthly", "bonus"]),
  /** Signed: negative removes credits. */
  amount: z.number().int().refine((value) => value !== 0, "Amount cannot be zero"),
  reason: z.string().trim().min(1).max(500),
});

const userCreditsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

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

      const [account] = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          banned: user.banned,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      if (!account) {
        return c.json(errorBody({ message: "User not found", code: "NOT_FOUND" }), 404);
      }

      const ledger = await readLedger({ userId, page, perPage });
      return c.json({ user: account, ledger });
    },
  );

/** Typed wallet errors keep their codes; anything else bubbles to onError. */
function handleWalletError(
  c: Context<AppEnv>,
  error: unknown,
  action: string,
  userId: string,
) {
  if (error instanceof UnknownUserError) {
    return c.json(errorBody({ message: error.message, code: error.code }), 404);
  }
  if (error instanceof BannedUserError) {
    const session = c.get("session");
    const log = c.get("log");
    log.audit.deny(error.message, {
      action,
      actor: { type: "user", id: session.user.id, email: session.user.email },
      target: { type: "credit_wallet", id: userId },
    });
    return c.json(errorBody({ message: error.message, code: error.code }), 400);
  }
  if (error instanceof AdjustmentBelowZeroError) {
    return c.json(
      errorBody({ message: error.message, code: error.code, issues: { bucket: error.bucket } }),
      400,
    );
  }
  throw error;
}
