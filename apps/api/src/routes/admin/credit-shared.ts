import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";
import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { user } from "@repo/db/schema/auth-schema";
import {
  AdjustmentBelowZeroError,
  BannedUserError,
  UnknownUserError,
  readLedger,
  readWalletForUser,
} from "../credits/wallet";

export const grantInput = z.object({
  userId: z.string().min(1).max(64),
  amount: z.number().int().min(1).max(10_000),
  reason: z.string().trim().min(1).max(500),
});

export const adjustInput = z.object({
  userId: z.string().min(1).max(64),
  bucket: z.enum(["monthly", "bonus"]),
  /** Signed: negative removes credits. */
  amount: z.number().int().refine((value) => value !== 0, "Amount cannot be zero"),
  reason: z.string().trim().min(1).max(500),
});

export const userCreditsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminUserCreditsPage = Awaited<ReturnType<typeof readAdminUserCredits>>;

/** Wallet snapshot (no allocation) plus the user and their ledger page. */
export async function readAdminUserCredits(input: {
  userId: string;
  page: number;
  perPage: number;
}) {
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
    .where(eq(user.id, input.userId))
    .limit(1);
  if (!account) return undefined;

  const [wallet, ledger] = await Promise.all([
    readWalletForUser(input.userId),
    readLedger({ userId: input.userId, page: input.page, perPage: input.perPage }),
  ]);
  return {
    user: account,
    wallet: {
      monthly: wallet?.monthlyBalance ?? 0,
      bonus: wallet?.bonusBalance ?? 0,
      /** Period the monthly balance was granted for; null when the user has no wallet. */
      monthlyPeriodKey: wallet?.monthlyPeriodKey ?? null,
    },
    ledger,
  };
}

/** Typed wallet errors keep their codes; anything else bubbles to onError. */
export function handleWalletError(
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
