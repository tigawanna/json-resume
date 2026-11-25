import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { user } from '@repo/db/schema/auth-schema';
import { creditLedger, creditWallet } from '@repo/db/schema/credits-schema';
import { and, asc, desc, eq, gt, lt, or, sql } from 'drizzle-orm';
import { CreditsService } from '../../credits/credits.service.js';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import { encodeCursor, type CursorQuery } from '../../shared/pagination/cursor.js';
import type { CursorPaginatedDto } from '../../shared/types/response-shapes.js';
import type { AdjustCreditsDto } from './admin-credits.dto.js';

type CreditLedgerEntry = typeof creditLedger.$inferSelect;

@Injectable()
export class AdminCreditsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly credits: CreditsService,
  ) {}

  async read({ userId }: { userId: string }) {
    await this.assertUser({ userId });
    return this.credits.read({ userId });
  }

  async ledger({
    userId,
    query,
  }: {
    userId: string;
    query: CursorQuery;
  }): Promise<CursorPaginatedDto<CreditLedgerEntry>> {
    const { cursor, direction, limit } = query;
    const forward = direction === 'next';
    const dirct = forward ? lt : gt;
    const order = forward ? desc : asc;
    const rows = await this.db
      .select()
      .from(creditLedger)
      .where(
        and(
          eq(creditLedger.userId, userId),
          cursor
            ? or(
                dirct(creditLedger.createdAt, cursor.createdAt),
                and(eq(creditLedger.createdAt, cursor.createdAt), dirct(creditLedger.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(order(creditLedger.createdAt), order(creditLedger.id))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const items = forward ? page : page.reverse();
    const hasNextPage = forward ? hasMore : Boolean(cursor);
    const hasPreviousPage = forward ? Boolean(cursor) : hasMore;
    const first = items.at(0);
    const last = items.at(-1);
    return {
      items,
      nextCursor: hasNextPage && last ? encodeCursor(last) : null,
      previousCursor: hasPreviousPage && first ? encodeCursor(first) : null,
      hasNextPage,
      hasPreviousPage,
    };
  }

  /** Positive amounts are `admin_grant`, negative are `admin_adjustment`; both hit the bonus bucket. */
  async adjust({ userId, adminId, body }: { userId: string; adminId: string; body: AdjustCreditsDto }) {
    await this.assertUser({ userId });
    const { wallet } = await this.credits.allocation({ userId });
    if (wallet.bonusBalance + body.amount < 0) {
      throw new BadRequestException('Adjustment would make the bonus balance negative');
    }
    await this.db.transaction(async (tx) => {
      const [entry] = await tx
        .insert(creditLedger)
        .values({
          userId,
          bucket: 'bonus',
          type: body.amount > 0 ? 'admin_grant' : 'admin_adjustment',
          amount: body.amount,
          reason: body.reason,
          createdByUserId: adminId,
          idempotencyKey: `admin:${body.idempotencyKey}`,
        })
        .onConflictDoNothing({ target: creditLedger.idempotencyKey })
        .returning();
      if (!entry) return;
      await tx
        .update(creditWallet)
        .set({ bonusBalance: sql`${creditWallet.bonusBalance} + ${body.amount}` })
        .where(eq(creditWallet.userId, userId));
    });
    return this.credits.read({ userId });
  }

  private async assertUser({ userId }: { userId: string }) {
    const [row] = await this.db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
    if (!row) throw new NotFoundException('User not found');
  }
}
