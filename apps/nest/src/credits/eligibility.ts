import { user } from "@repo/db/postgres/schema/auth-schema";
import { waitlistEntry } from "@repo/db/postgres/schema/credits-schema";
import { and, eq, or } from "drizzle-orm";
import type { DrizzleDB } from "../database/database.module.js";

type Executor = Pick<DrizzleDB, "select">;

export async function isEligibleForMonthly({
  db,
  userId,
  requireWaitlist,
}: {
  db: Executor;
  userId: string;
  requireWaitlist: boolean;
}) {
  const [account] = await db
    .select({ banned: user.banned })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!account || account.banned) return false;
  if (!requireWaitlist) return true;
  return hasJoinedWaitlist({ db, userId });
}

export async function hasJoinedWaitlist({ db, userId }: { db: Executor; userId: string }) {
  const [entry] = await db
    .select({ id: waitlistEntry.id })
    .from(user)
    .innerJoin(
      waitlistEntry,
      and(
        eq(waitlistEntry.status, "joined"),
        or(eq(waitlistEntry.userId, user.id), eq(waitlistEntry.email, user.email)),
      ),
    )
    .where(eq(user.id, userId))
    .limit(1);
  return Boolean(entry);
}
