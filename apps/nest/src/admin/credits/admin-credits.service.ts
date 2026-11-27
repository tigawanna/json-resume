import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { user } from '@repo/db/schema/auth-schema';
import { creditLedger, creditWallet } from '@repo/db/schema/credits-schema';
import { eq, getTableColumns } from 'drizzle-orm';
import { CreditLedgerService, type CreditLedgerPage } from '../../credits/credit-ledger.service.js';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import {
  AdminAuditService,
  type AdminActor,
} from '../audit/admin-audit.service.js';
import type { AdminAdjustDto, AdminGrantDto } from './admin-credits.dto.js';

type Executor = Pick<DrizzleDB, 'insert' | 'select' | 'update'>;
type WalletRow = typeof creditWallet.$inferSelect;

@Injectable()
export class AdminCreditsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly ledgerReader: CreditLedgerService,
    private readonly audit: AdminAuditService,
  ) {}

  async read({ userId }: { userId: string }) {
    const [row] = await this.db
      .select({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          banned: user.banned,
          createdAt: user.createdAt,
        },
        wallet: getTableColumns(creditWallet),
      })
      .from(user)
      .leftJoin(creditWallet, eq(creditWallet.userId, user.id))
      .where(eq(user.id, userId))
      .limit(1);
    if (!row) throw new NotFoundException('User not found');
    return {
      user: row.user,
      wallet: row.wallet ?? emptyWallet({ userId }),
    };
  }

  ledger({
    userId,
    query,
  }: {
    userId: string;
    query: { page: number; perPage: number };
  }): Promise<CreditLedgerPage> {
    return this.ledgerReader.page({ userId, page: query.page, perPage: query.perPage });
  }

  grant({
    actor,
    userId,
    body,
  }: {
    actor: AdminActor;
    userId: string;
    body: AdminGrantDto;
  }) {
    return this.audit.run({
      action: 'credits.admin-grant',
      actor,
      input: { userId, amount: body.amount, reason: body.reason },
      execute: () => this.mutate({ actor, userId, body, bucket: 'bonus', type: 'admin_grant' }),
    });
  }

  adjust({
    actor,
    userId,
    body,
  }: {
    actor: AdminActor;
    userId: string;
    body: AdminAdjustDto;
  }) {
    return this.audit.run({
      action: 'credits.admin-adjust',
      actor,
      input: { userId, bucket: body.bucket, amount: body.amount, reason: body.reason },
      execute: () =>
        this.mutate({
          actor,
          userId,
          body,
          bucket: body.bucket,
          type: 'admin_adjustment',
        }),
    });
  }

  private async mutate({
    actor,
    userId,
    body,
    bucket,
    type,
  }: {
    actor: AdminActor;
    userId: string;
    body: { amount: number; reason: string };
    bucket: 'monthly' | 'bonus';
    type: 'admin_grant' | 'admin_adjustment';
  }): Promise<{ wallet: WalletRow }> {
    const account = await this.assertMutatableUser({ userId });
    return this.db.transaction(async (tx) => {
      const wallet = await ensureWallet({ tx, userId });
      const current = bucket === 'monthly' ? wallet.monthlyBalance : wallet.bonusBalance;
      const next = current + body.amount;
      if (next < 0)
        throw new BadRequestException(`Adjustment would make the ${bucket} balance negative`);
      await tx.insert(creditLedger).values({
        userId,
        bucket,
        type,
        amount: body.amount,
        reason: body.reason,
        createdByUserId: actor.id,
        idempotencyKey: `admin:${crypto.randomUUID()}`,
      });
      const [updated] = await tx
        .update(creditWallet)
        .set(bucket === 'monthly' ? { monthlyBalance: next } : { bonusBalance: next })
        .where(eq(creditWallet.userId, userId))
        .returning();
      return { wallet: updated ?? emptyWallet({ userId, ...account }) };
    });
  }

  private async assertMutatableUser({ userId }: { userId: string }) {
    const [row] = await this.db
      .select({ id: user.id, banned: user.banned })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!row) throw new NotFoundException('User not found');
    if (row.banned) throw new BadRequestException('User is banned');
    return row;
  }
}

async function ensureWallet({ tx, userId }: { tx: Executor; userId: string }) {
  await tx.insert(creditWallet).values({ userId }).onConflictDoNothing();
  const [wallet] = await tx
    .select()
    .from(creditWallet)
    .where(eq(creditWallet.userId, userId))
    .limit(1);
  if (!wallet) throw new Error('Failed to create credit wallet');
  return wallet;
}

function emptyWallet({ userId }: { userId: string }) {
  return {
    userId,
    monthlyBalance: 0,
    bonusBalance: 0,
    monthlyPeriodKey: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}
