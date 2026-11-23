import { db } from "../../db/client";
import { eq } from "drizzle-orm";
import { creditWallet } from "@repo/db/schema/credits-schema";

/** The subset of the drizzle instance (or a transaction) used by wallet code. */
export type Executor = Pick<typeof db, "select" | "insert" | "update">;

export type CreditWallet = typeof creditWallet.$inferSelect;

export async function readWallet(tx: Executor, userId: string): Promise<CreditWallet | undefined> {
  const [wallet] = await tx
    .select()
    .from(creditWallet)
    .where(eq(creditWallet.userId, userId))
    .limit(1);
  return wallet;
}

export async function ensureWallet(tx: Executor, userId: string): Promise<CreditWallet> {
  const existing = await readWallet(tx, userId);
  if (existing) return existing;
  await tx.insert(creditWallet).values({ userId }).onConflictDoNothing();
  const wallet = await readWallet(tx, userId);
  if (!wallet) throw new Error("Failed to create credit wallet");
  return wallet;
}

/**
 * Read-only wallet view. Never allocates: admins see the stored snapshot, and
 * the user's own reads stay the allocation trigger (plan §5.2).
 */
export async function readWalletForUser(userId: string): Promise<CreditWallet | undefined> {
  return readWallet(db, userId);
}
