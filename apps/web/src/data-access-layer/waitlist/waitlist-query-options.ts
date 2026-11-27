import {
  adminWaitlistControllerFindAll,
  adminWaitlistControllerStats,
  adminWaitlistControllerUpdate,
  waitlistControllerClaim,
  waitlistControllerJoin,
} from "@/services/nest/client";
import { clientEnv } from "@/lib/env/client-env";
import type {
  AdminWaitlistControllerFindAllResponses,
  AdminWaitlistControllerStatsResponses,
} from "@/services/nest/generated/models";
import { mutationOptions, queryOptions } from "@tanstack/react-query";

export type WaitlistSource = "landing" | "waitlist-page" | "dashboard";

export type JoinWaitlistInput = {
  email: string;
  name?: string;
  source: WaitlistSource;
  /** Honeypot. Real users never fill this; pass it through untouched. */
  website?: string;
};

export const ADMIN_WAITLIST_EXPORT_URL = `${clientEnv.VITE_NEST_API_URL}/api/admin/waitlist/export`;

/** Public join. The API returns the same body for new and existing emails. */
export const joinWaitlistMutationOptions = mutationOptions({
  mutationKey: ["waitlist", "join"],
  mutationFn: (input: JoinWaitlistInput) =>
    waitlistControllerJoin({
      body: {
        email: input.email,
        name: input.name,
        source: input.source,
        website: input.website ?? "",
        consent: true,
      },
    }),
});

/**
 * Idempotent claim: links the signed-in account to an existing waitlist entry
 * with the same email. Failures are non-fatal; callers should stay silent.
 */
export const claimWaitlistMutationOptions = mutationOptions({
  mutationKey: ["waitlist", "claim"],
  mutationFn: () => waitlistControllerClaim(),
});

export type AdminWaitlistFilters = {
  page: number;
  perPage: number;
  q?: string;
  status?: "joined" | "removed";
  hasAccount?: "true" | "false";
};

export type AdminWaitlistResponse =
  AdminWaitlistControllerFindAllResponses["200"];
export type AdminWaitlistEntry = AdminWaitlistResponse["items"][number];

export function adminWaitlistQueryOptions(input: AdminWaitlistFilters) {
  return queryOptions({
    queryKey: ["waitlist", "admin", "list", input],
    queryFn: () => adminWaitlistControllerFindAll<true>({ query: input }),
  });
}

export type AdminWaitlistStats = AdminWaitlistControllerStatsResponses["200"];

export const adminWaitlistStatsQueryOptions = queryOptions({
  queryKey: ["waitlist", "admin", "stats"],
  queryFn: () => adminWaitlistControllerStats<true>(),
});

export type AdminWaitlistPatch = {
  status?: "joined" | "removed";
  /** `null` unlinks the account; a user id links it. */
  userId?: string | null;
  notes?: string | null;
};

export function adminWaitlistUpdateMutationOptions() {
  return mutationOptions({
    mutationKey: ["waitlist", "admin", "update"],
    mutationFn: (input: { id: string; patch: AdminWaitlistPatch }) =>
      adminWaitlistControllerUpdate({ path: { id: input.id }, body: input.patch }),
    meta: { invalidates: [["waitlist"]] },
  });
}
