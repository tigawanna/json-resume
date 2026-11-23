import { errorBody } from "@api/lib/http";
import { AdjustmentBelowZeroError, BannedUserError, UnknownUserError } from "@api/modules/credits";
import type { AppEnv } from "@api/types";
import type { Context } from "hono";

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
