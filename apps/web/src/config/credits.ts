/**
 * Client-safe credit policy. Credits are grant-only: there are no payments,
 * plans, or purchases. 1 credit = 1 résumé (the row plus everything scoped to
 * its `resumeId`). Editing is always free.
 */
export const CREDIT_POLICY = {
  /** Fresh monthly credits per eligible account, per UTC calendar month. */
  monthlyCredits: 20,
  /** Credits charged per new résumé (create, clone, import, AI-created). */
  resumeCost: 1,
  /**
   * When false, every signed-in non-banned hosted account gets the monthly
   * allocation. When true, only accounts linked to a waitlist entry do.
   */
  requireWaitlist: false,
} as const;
