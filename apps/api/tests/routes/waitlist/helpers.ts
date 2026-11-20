import { expect } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { user } from "@repo/db/schema/auth-schema";
import { waitlistEntry } from "@repo/db/schema/credits-schema";
import { apiClient, authSignUpRequest, sessionInit } from "@api/core/testing/api-client";
import { db } from "@api/db/client";

export type JoinResponse = { joined: boolean };
export type ClaimResponse = { claimed: boolean };
export type ApiError = { error: { message: string; code?: string } };
export type Entry = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  source: string;
  notes: string | null;
  userId: string | null;
  userEmail: string | null;
};
export type EntryPage = {
  items: Entry[];
  pagination: { page: number; perPage: number; total: number; totalPages: number };
};

/** Every test file gets fresh addresses so a shared database never collides. */
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const adminToken = `admin-${runId}`;

const touchedWaitlistEmails = new Set<string>();
const touchedUserEmails: string[] = [];

export function emailFor({ label }: { label: string }) {
  return `waitlist-${label}-${runId}@example.com`;
}

export function trackEmail({ email }: { email: string }) {
  touchedWaitlistEmails.add(email.trim().toLowerCase());
}

export async function signUp({
  label,
  email = emailFor({ label }),
  name,
}: {
  label: string;
  email?: string;
  name: string;
}) {
  const res = await authSignUpRequest({ email, name });
  expect(res.status).toBe(200);

  touchedUserEmails.push(email);
  trackEmail({ email });
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  return { email, cookie: res.headers.get("set-cookie")!.split(";")[0]!, userId: row!.id };
}

export async function makeAdmin({ email }: { email: string }) {
  await db.update(user).set({ role: "admin" }).where(eq(user.email, email));
}

export function joinWaitlist({
  email,
  body = {},
  cookie,
}: {
  email: string;
  body?: {
    name?: string;
    source?: "landing" | "waitlist-page" | "dashboard" | "admin";
    website?: string;
    consent?: boolean;
  };
  cookie?: string;
}) {
  trackEmail({ email });
  const json = {
    email,
    consent: true as const,
    source: "landing" as const,
    ...body,
  } as {
    email: string;
    consent: true;
    source?: "landing" | "waitlist-page" | "dashboard";
    name?: string;
    website?: string;
  };
  if (cookie) {
    return apiClient.api.waitlist.$post({ json }, sessionInit({ cookie }));
  }
  return apiClient.api.waitlist.$post({ json });
}

export function claimWaitlist({ cookie }: { cookie?: string } = {}) {
  if (cookie) {
    return apiClient.api.waitlist.claim.$post(undefined, sessionInit({ cookie }));
  }
  return apiClient.api.waitlist.claim.$post();
}

export async function seedEntry({
  label,
  status = "joined",
  name,
  userId,
  source = "admin",
}: {
  label: string;
  status?: string;
  name?: string;
  userId?: string | null;
  source?: string;
}): Promise<{ id: string; email: string }> {
  const email = `waitlist-${adminToken}-${label}@example.com`;
  trackEmail({ email });
  const [row] = await db
    .insert(waitlistEntry)
    .values({
      email,
      name: name ?? label,
      status,
      source,
      consentAt: new Date(),
      userId: userId ?? null,
    })
    .returning({ id: waitlistEntry.id });
  return { id: row!.id, email };
}

export async function cleanupTouchedRecords() {
  if (touchedWaitlistEmails.size > 0) {
    await db
      .delete(waitlistEntry)
      .where(inArray(waitlistEntry.email, Array.from(touchedWaitlistEmails)));
  }
  if (touchedUserEmails.length > 0) {
    await db.delete(user).where(inArray(user.email, touchedUserEmails));
  }
}

export function forgetTrackedEmail({ email }: { email: string }) {
  touchedWaitlistEmails.delete(email.trim().toLowerCase());
}
