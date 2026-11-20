import { db } from "@api/db/client";
import { readLedger } from "@api/modules/credits";
import { readWalletForUser } from "@api/modules/wallet";
import { user } from "@repo/db/schema/auth-schema";
import { eq } from "drizzle-orm";

/** Wallet snapshot (no allocation) plus the account. */
export async function readAdminWallet(input: { userId: string }) {
  const [account] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1);
  if (!account) return undefined;

  const wallet = await readWalletForUser(input.userId);
  return {
    user: account,
    wallet: {
      monthly: wallet?.monthlyBalance ?? 0,
      bonus: wallet?.bonusBalance ?? 0,
      monthlyPeriodKey: wallet?.monthlyPeriodKey ?? null,
    },
  };
}

export async function readAdminWalletCredits(input: {
  userId: string;
  page: number;
  perPage: number;
}) {
  const page_ = await readAdminWallet({ userId: input.userId });
  if (!page_) return undefined;
  const ledger = await readLedger({
    userId: input.userId,
    page: input.page,
    perPage: input.perPage,
  });
  return ledger;
}
