import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { creditLedger } from "@repo/db/schema/credits-schema";
import type { Executor } from "./store";

export type LedgerPage = {
  items: Array<typeof creditLedger.$inferSelect>;
  pagination: { page: number; perPage: number; total: number; totalPages: number };
};

/** Paginated ledger for one user, newest first. */
export async function readLedger(input: {
  userId: string;
  page: number;
  perPage: number;
  tx?: Executor;
}): Promise<LedgerPage> {
  const tx = input.tx ?? db;
  const [totalRow] = await tx
    .select({ total: count() })
    .from(creditLedger)
    .where(eq(creditLedger.userId, input.userId));
  const total = totalRow?.total ?? 0;

  const items = await tx
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.userId, input.userId))
    .orderBy(desc(creditLedger.createdAt), asc(creditLedger.id))
    .limit(input.perPage)
    .offset((input.page - 1) * input.perPage);

  return {
    items,
    pagination: {
      page: input.page,
      perPage: input.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.perPage)),
    },
  };
}
