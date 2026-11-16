/**
 * Credit wallet, allocation, spend, and admin operations. Split by concern:
 *
 * - `errors.ts` typed expected errors
 * - `store.ts` wallet row access
 * - `period.ts` UTC period keys
 * - `eligibility.ts` monthly eligibility + waitlist link check
 * - `allocation.ts` lazy monthly allocation
 * - `spend.ts` résumé credit spends
 * - `admin-ops.ts` admin grants and adjustments
 * - `ledger.ts` paginated ledger reads
 */
export {
  AdjustmentBelowZeroError,
  BannedUserError,
  InsufficientCreditsError,
  UnknownUserError,
} from "./errors";
export { ensureWallet, readWallet, readWalletForUser, type CreditWallet, type Executor } from "./store";
export { nextResetAt, periodKeyOf } from "./period";
export { hasJoinedWaitlist, isEligibleForMonthly } from "./eligibility";
export { ensureMonthlyAllocation } from "./allocation";
export {
  spendResumeCredit,
  recordResumeOverdraft,
  type SpendResult,
} from "./spend";
export { adminAdjustCredits, adminGrantCredits } from "./admin-ops";
export { readLedger, type LedgerPage } from "./ledger";
