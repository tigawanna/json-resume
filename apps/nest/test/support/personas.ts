import { user } from "@repo/db/schema/auth-schema";
import { creditWallet, waitlistEntry } from "@repo/db/schema/credits-schema";
import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../../src/database/database.module.js";

type Persona = {
  key: string;
  id: string;
  email: string;
  name: string;
  role: string | null;
  banned: boolean;
  waitlist: boolean;
};

export const personas = {
  member: persona({ key: "member", role: "user" }),
  memberWaitlisted: persona({ key: "memberWaitlisted", role: "user", waitlist: true }),
  admin: persona({ key: "admin", role: "admin" }),
  adminWaitlisted: persona({ key: "adminWaitlisted", role: "admin", waitlist: true }),
  banned: persona({ key: "banned", role: "user", banned: true }),
  bannedAdmin: persona({ key: "bannedAdmin", role: "admin", banned: true }),
  noRole: persona({ key: "noRole", role: null }),
  multiRole: persona({ key: "multiRole", role: "admin,user" }),
} as const;

export async function seedPersonas({ db }: { db: DrizzleDB }) {
  const now = new Date();
  for (const row of Object.values(personas)) {
    await db.insert(user).values({
      id: row.id,
      name: row.name,
      email: row.email,
      emailVerified: true,
      role: row.role,
      banned: row.banned,
      createdAt: now,
      updatedAt: now,
    });
    if (!row.waitlist) continue;
    await db.insert(waitlistEntry).values({
      email: row.email,
      name: row.name,
      userId: row.id,
      status: "joined",
      source: "landing",
      consentAt: now,
      claimedAt: now,
    });
  }
}

export async function walletOf({ db, userId }: { db: DrizzleDB; userId: string }) {
  const [row] = await db
    .select()
    .from(creditWallet)
    .where(eq(creditWallet.userId, userId))
    .limit(1);
  return row;
}

function persona({
  key,
  role,
  banned = false,
  waitlist = false,
}: {
  key: string;
  role: string | null;
  banned?: boolean;
  waitlist?: boolean;
}): Persona {
  return {
    key,
    id: `user-${key}`,
    email: `${key}@example.com`,
    name: key,
    role,
    banned,
    waitlist,
  };
}
