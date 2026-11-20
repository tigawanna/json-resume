import { expect } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { apiClient, authSignUpRequest, sessionInit } from "@api/core/testing/api-client";
import { db } from "../../db/client";
import { user } from "@repo/db/schema/auth-schema";
import { creditLedger, creditWallet } from "@repo/db/schema/credits-schema";

/** A fixed instant inside each UTC month, far from month boundaries. */
export const FEB_2026 = new Date("2026-02-10T12:00:00Z");
export const MAR_2026 = new Date("2026-03-10T12:00:00Z");

const touchedUserEmails: string[] = [];
const touchedUserIds: string[] = [];

/** Sign up through Better Auth and return the session cookie + user id. */
export async function signUp(email: string, name: string) {
  const res = await authSignUpRequest({ email, name });
  expect(res.status).toBe(200);
  touchedUserEmails.push(email);
  const cookie = res.headers.get("set-cookie")!.split(";")[0]!;
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  touchedUserIds.push(row!.id);
  return { cookie, userId: row!.id };
}

export async function makeAdmin(email: string) {
  await db.update(user).set({ role: "admin" }).where(eq(user.email, email));
}

export function walletRequest(cookie: string) {
  return apiClient.api.wallet.$get(undefined, sessionInit({ cookie }));
}

/** Removes users last: wallet and ledger rows cascade on user delete. */
export async function cleanupTouchedUsers() {
  if (touchedUserIds.length > 0) {
    await db.delete(creditLedger).where(inArray(creditLedger.userId, touchedUserIds));
    await db.delete(creditWallet).where(inArray(creditWallet.userId, touchedUserIds));
  }
  for (const email of touchedUserEmails) {
    await db.delete(user).where(eq(user.email, email));
  }
}

export type ApiError = { error: { message: string; code?: string } };

export type WalletResponse = {
  monthly: number;
  bonus: number;
  available: number;
  monthlyPeriodKey: string | null;
  resetsAt: string;
  waitlistJoined: boolean;
};
