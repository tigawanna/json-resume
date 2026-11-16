import { CREDIT_POLICY } from "@/config/credits";
import { clientEnv } from "@/lib/env/client-env";
import { honoClient } from "@/lib/hono/client";
import { parseApiError } from "@/lib/hono/parse-api-error";

/** Fired when a creation is blocked, so the dashboard can show one shared dialog. */
export const OUT_OF_CREDITS_EVENT = "credits:out-of-credits";

export type CreditAction = "create" | "clone" | "import" | "tailor";

export type CreditDenial = {
  action: CreditAction;
  available: number;
  resetsAt: string;
};

export type CreditGuardResult =
  | { ok: true }
  | ({ ok: false; reason: "insufficient" } & CreditDenial);

/** Thrown by the shared write helpers so local data is not written at 0 credits. */
export class InsufficientCreditsClientError extends Error {
  readonly denial: CreditDenial;

  constructor(denial: CreditDenial) {
    const resetDate = new Date(denial.resetsAt).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    });
    // AI tool handlers throw this; @tanstack/ai relays the message to the model.
    super(
      `You've used your ${CREDIT_POLICY.monthlyCredits} résumés this month. Credits reset on ${resetDate}. Editing existing résumés is free.`,
    );
    this.name = "InsufficientCreditsClientError";
    this.denial = denial;
  }
}

export function isCreditDenial(err: unknown): err is InsufficientCreditsClientError {
  return err instanceof InsufficientCreditsClientError;
}

export function dispatchOutOfCredits(denial: CreditDenial): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OUT_OF_CREDITS_EVENT, { detail: denial }));
}

function creditsBypassed(): boolean {
  return clientEnv.VITE_CREDITS_ENABLED !== "true" || clientEnv.VITE_DESKTOP === "true";
}

/**
 * Pre-flight check before a local résumé insert (plan §6.2). Disabled builds,
 * desktop builds, offline clients, and RPC failures all allow the write: the
 * server records the spend, or an overdraft, and the user keeps their data.
 */
export async function ensureResumeCredit(input: {
  action: CreditAction;
  notify?: boolean;
}): Promise<CreditGuardResult> {
  if (creditsBypassed()) return { ok: true };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: true };

  try {
    const response = await honoClient.api.credits.check.$post({
      json: { action: input.action },
    });
    if (!response.ok) throw await parseApiError(response, "Could not check your credits");

    const { available, resetsAt } = await response.json();
    if (available >= CREDIT_POLICY.resumeCost) return { ok: true };

    const denial: CreditDenial = { action: input.action, available, resetsAt };
    if (input.notify !== false) dispatchOutOfCredits(denial);
    return { ok: false, reason: "insufficient", ...denial };
  } catch {
    return { ok: true };
  }
}

/** Guard for shared write helpers: throws before any local insert on a denial. */
export async function requireResumeCredit(input: {
  action: CreditAction;
  notify?: boolean;
}): Promise<void> {
  const result = await ensureResumeCredit(input);
  if (!result.ok) throw new InsufficientCreditsClientError(result);
}
