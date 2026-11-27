import { creditLedger } from '@repo/db/postgres/schema/credits-schema';
import { asc, count, desc, eq } from 'drizzle-orm';
import type { DrizzleDB } from '../database/database.module.js';

type CreditLedgerEntry = typeof creditLedger.$inferSelect;

export type CreditLedgerPage = {
  items: CreditLedgerEntry[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

export class CreditLedgerService {
  constructor(private readonly db: Pick<DrizzleDB, 'select'>) {}

  async page({
    userId,
    page,
    perPage,
  }: {
    userId: string;
    page: number;
    perPage: number;
  }): Promise<CreditLedgerPage> {
    const [[totals], items] = await Promise.all([
      this.db
        .select({ n: count() })
        .from(creditLedger)
        .where(eq(creditLedger.userId, userId)),
      this.db
        .select()
        .from(creditLedger)
        .where(eq(creditLedger.userId, userId))
        .orderBy(desc(creditLedger.createdAt), asc(creditLedger.id))
        .limit(perPage)
        .offset((page - 1) * perPage),
    ]);
    const total = totals?.n ?? 0;
    return {
      items,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  }
}
