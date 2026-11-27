import { creditWallet } from '@repo/db/schema/credits-schema';
import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '../database/database.module.js';

type Wallet = typeof creditWallet.$inferSelect;
export type WalletExecutor = Pick<DrizzleDB, 'select' | 'insert' | 'update'>;

export class CreditWalletService {
  async ensure({ db, userId }: { db: WalletExecutor; userId: string }): Promise<Wallet> {
    await db.insert(creditWallet).values({ userId }).onConflictDoNothing();
    const wallet = await this.read({ db, userId });
    if (!wallet) throw new Error('Failed to create credit wallet');
    return wallet;
  }

  async read({ db, userId }: { db: WalletExecutor; userId: string }) {
    const [wallet] = await db
      .select()
      .from(creditWallet)
      .where(eq(creditWallet.userId, userId))
      .limit(1);
    return wallet;
  }
}
