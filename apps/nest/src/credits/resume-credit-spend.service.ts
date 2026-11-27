import { Inject, Injectable } from '@nestjs/common';
import { creditLedger, creditWallet } from '@repo/db/schema/credits-schema';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import { CreditWalletService } from './credit-wallet.service.js';
import { InsufficientCreditsError } from './credits-errors.js';
import { CREDITS_POLICY, CreditsService } from './credits.service.js';
import type { CreditsPolicy } from './allocate.js';

export type SpendResult =
  | { status: 'charged'; bucket: 'monthly' | 'bonus'; balance: number }
  | { status: 'already-charged' }
  | { status: 'grandfathered' };

@Injectable()
export class ResumeCreditSpendService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly wallets: CreditWalletService,
    private readonly credits: CreditsService,
    @Inject(CREDITS_POLICY) private readonly policy: CreditsPolicy,
  ) {}

  async spend({
    userId,
    resumeId,
    grandfathered = false,
    reason,
    now,
  }: {
    userId: string;
    resumeId: string;
    grandfathered?: boolean;
    reason?: string;
    now?: Date;
  }): Promise<SpendResult> {
    const key = `resume:${resumeId}`;
    const [existing] = await this.db
      .select({ id: creditLedger.id })
      .from(creditLedger)
      .where(eq(creditLedger.idempotencyKey, key))
      .limit(1);
    if (existing) return { status: 'already-charged' };

    if (grandfathered) {
      await this.db.transaction(async (tx) => {
        await this.wallets.ensure({ db: tx, userId });
        await tx.insert(creditLedger).values({
          userId,
          bucket: 'monthly',
          type: 'resume_spend',
          amount: 0,
          idempotencyKey: key,
          resumeId,
          reason: reason ?? 'grandfathered',
        });
      });
      return { status: 'grandfathered' };
    }

    await this.credits.allocation({ userId, now });
    return this.charge({ userId, resumeId, key });
  }

  async recordOverdraft({ userId, resumeId }: { userId: string; resumeId: string }) {
    await this.db
      .insert(creditLedger)
      .values({
        userId,
        bucket: 'monthly',
        type: 'resume_overdraft',
        amount: 0,
        idempotencyKey: `resume:${resumeId}`,
        resumeId,
        reason: 'overdraft',
      })
      .onConflictDoNothing();
  }

  private async charge({
    userId,
    resumeId,
    key,
  }: {
    userId: string;
    resumeId: string;
    key: string;
  }): Promise<SpendResult> {
    const cost = this.policy.resumeCost;
    return this.db.transaction(async (tx) => {
      const wallet = await this.wallets.read({ db: tx, userId });
      if (!wallet) throw new Error('Failed to read credit wallet');
      const available = wallet.monthlyBalance + wallet.bonusBalance;
      if (available < cost) throw new InsufficientCreditsError({ available });

      let remaining = cost;
      let chargedBucket: 'monthly' | 'bonus' = 'bonus';
      for (const bucket of ['monthly', 'bonus'] as const) {
        const balance = bucket === 'monthly' ? wallet.monthlyBalance : wallet.bonusBalance;
        const take = Math.min(balance, remaining);
        if (take <= 0) continue;
        await tx.insert(creditLedger).values({
          userId,
          bucket,
          type: 'resume_spend',
          amount: -take,
          idempotencyKey: remaining === cost ? key : `${key}:${bucket}`,
          resumeId,
        });
        chargedBucket = bucket;
        remaining -= take;
      }
      const [updated] = await tx
        .update(creditWallet)
        .set({
          monthlyBalance: wallet.monthlyBalance - Math.min(wallet.monthlyBalance, cost),
          bonusBalance: wallet.bonusBalance - Math.max(0, cost - wallet.monthlyBalance),
        })
        .where(eq(creditWallet.userId, userId))
        .returning();
      return {
        status: 'charged' as const,
        bucket: chargedBucket,
        balance: (updated?.monthlyBalance ?? 0) + (updated?.bonusBalance ?? 0),
      };
    });
  }
}
