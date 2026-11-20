import { CREDIT_POLICY } from "@repo/isomorphic/credits-policy";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../db/client";
import { user } from "@repo/db/schema/auth-schema";
import { waitlistEntry } from "@repo/db/schema/credits-schema";
import type { Executor } from "./store";

/**
 * Eligibility for the monthly allocation (plan §5.1): banned accounts never
 * get credits; otherwise everyone, unless `requireWaitlist` is on.
 */
export async function isEligibleForMonthly(tx: Executor, userId: string): Promise<boolean> {
  const [account] = await tx
    .select({ email: user.email, banned: user.banned })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!account || account.banned) return false;
  if (!CREDIT_POLICY.requireWaitlist) return true;

  const [entry] = await tx
    .select({ id: waitlistEntry.id })
    .from(waitlistEntry)
    .where(
      and(
        eq(waitlistEntry.status, "joined"),
        or(eq(waitlistEntry.userId, userId), eq(waitlistEntry.email, account.email)),
      ),
    )
    .limit(1);
  return Boolean(entry);
}

/** Whether the account has a joined waitlist entry (by link or email). */
export async function hasJoinedWaitlist(userId: string): Promise<boolean> {
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
