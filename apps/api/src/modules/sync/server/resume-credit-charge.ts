import { env } from "@api/env";
import {
  InsufficientCreditsError,
  recordResumeOverdraft,
  spendResumeCredit,
} from "@api/routes/credits/wallet";
import { unwrapUnknownError } from "@api/utils/errors";
import { log } from "evlog";

/**
 * Credits are enforced honestly, not defensively (plan §6.1): a synced résumé
 * is always projected. If the wallet is empty we record an overdraft instead,
 * so the client can never lose data by being offline or out of date.
 */
export type CreditChargePolicy = {
  enabled: boolean;
  /** ISO instant; résumés created before this are grandfathered. */
  startAt: string | undefined;
};

function policyFromEnv(): CreditChargePolicy {
  return { enabled: env.CREDITS_ENABLED === "true", startAt: env.CREDITS_START_AT };
}

/** Only a new `resume` row costs a credit — never its children, updates, or deletes. */
export function isChargeableResumeInsert(collectionId: string, type: string): boolean {
  return collectionId === "resume" && type === "insert";
}

export async function chargeProjectedResume(input: {
  userId: string;
  resumeId: string;
  createdAt: Date | undefined;
  /** Override for tests; production reads the validated API env. */
  policy?: CreditChargePolicy;
}): Promise<void> {
  const policy = input.policy ?? policyFromEnv();
  if (!policy.enabled) return;

  const startAt = policy.startAt ? new Date(policy.startAt) : undefined;
  const grandfathered = Boolean(startAt && input.createdAt && input.createdAt < startAt);

  try {
    await spendResumeCredit({
      userId: input.userId,
      resumeId: input.resumeId,
      grandfathered,
      reason: grandfathered ? "legacy-import" : undefined,
    });
  } catch (err: unknown) {
    if (err instanceof InsufficientCreditsError) {
      await recordResumeOverdraft({ userId: input.userId, resumeId: input.resumeId });
      log.warn({
        message: "credits.overdraft",
        service: "agentic-json-resume",
        userId: input.userId,
        resumeId: input.resumeId,
        available: err.available,
      });
      return;
    }
    // Bookkeeping failures must not drop a résumé. Leave the ledger key absent
    // so a later rebuild can retry the charge.
    log.warn({
      message: "credits.projection_error",
      service: "agentic-json-resume",
      userId: input.userId,
      resumeId: input.resumeId,
      reason: unwrapUnknownError(err).message,
    });
  }
}
