import { Inject, Injectable } from "@nestjs/common";
import { CREDIT_POLICY } from "@repo/isomorphic/credits-policy";
import { DRIZZLE, type DrizzleDB } from "../database/database.module.js";
import { ensureMonthlyAllocation, type CreditsPolicy } from "./allocate.js";
import { hasJoinedWaitlist } from "./eligibility.js";
import { nextResetAt } from "./period.js";

export const CREDITS_POLICY = Symbol("CREDITS_POLICY");

export type CreditsView = {
  monthly: number;
  bonus: number;
  available: number;
  monthlyPeriodKey: string | null;
  /** ISO instant when the monthly bucket resets. */
  resetsAt: string;
  waitlistJoined: boolean;
  policy: CreditsPolicy;
};

@Injectable()
export class CreditsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(CREDITS_POLICY) readonly policy: CreditsPolicy,
  ) {}

  allocation({ userId, now }: { userId: string; now?: Date }) {
    return ensureMonthlyAllocation({ db: this.db, userId, policy: this.policy, now });
  }

  /** Pre-flight check: allocate the current month, then report without spending. */
  async check({
    userId,
    action: _action,
  }: {
    userId: string;
    action: 'create' | 'clone' | 'import' | 'tailor';
  }) {
    const { wallet } = await this.allocation({ userId });
    return {
      available: wallet.monthlyBalance + wallet.bonusBalance,
      monthly: wallet.monthlyBalance,
      bonus: wallet.bonusBalance,
      resetsAt: nextResetAt({ date: new Date() }).toISOString(),
    };
  }

  async read({ userId }: { userId: string }): Promise<CreditsView> {
    const { wallet } = await this.allocation({ userId });
    const waitlistJoined = await hasJoinedWaitlist({ db: this.db, userId });
    return {
      monthly: wallet.monthlyBalance,
      bonus: wallet.bonusBalance,
      available: wallet.monthlyBalance + wallet.bonusBalance,
      monthlyPeriodKey: wallet.monthlyPeriodKey,
      resetsAt: nextResetAt({ date: new Date() }).toISOString(),
      waitlistJoined,
      policy: this.policy,
    };
  }
}

export const defaultCreditsPolicy: CreditsPolicy = CREDIT_POLICY;
