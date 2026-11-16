import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { honoClient } from "@/lib/hono/client";
import { parseApiError } from "@/lib/hono/parse-api-error";

/** Where a waitlist join came from. `admin` is server-side only. */
export type WaitlistSource = "landing" | "waitlist-page" | "dashboard";

export type JoinWaitlistInput = {
  email: string;
  name?: string;
  source: WaitlistSource;
  /** Honeypot. Real users never fill this; pass it through untouched. */
  website?: string;
};

async function joinWaitlist(input: JoinWaitlistInput) {
  const response = await honoClient.api.waitlist.$post({
    json: {
      email: input.email,
      name: input.name,
      source: input.source,
      website: input.website ?? "",
      consent: true,
    },
  });
  if (!response.ok) throw await parseApiError(response, "Could not join the waitlist");
  return response.json();
}

/** Public join. The API returns the same body for new and existing emails. */
export const joinWaitlistMutationOptions = mutationOptions({
  mutationKey: ["waitlist", "join"],
  mutationFn: joinWaitlist,
});

/**
 * Idempotent claim: links the signed-in account to an existing waitlist entry
 * with the same email. Failures are non-fatal; callers should stay silent.
 */
export const claimWaitlistMutationOptions = mutationOptions({
  mutationKey: ["waitlist", "claim"],
  mutationFn: async () => {
    const response = await honoClient.api.waitlist.claim.$post();
    if (!response.ok) throw await parseApiError(response, "Could not link your waitlist entry");
    return response.json();
  },
});

export type AdminWaitlistFilters = {
  page: number;
  perPage: number;
  q?: string;
  status?: "joined" | "removed";
  hasAccount?: "true" | "false";
};

async function fetchAdminWaitlistEntries(input: AdminWaitlistFilters) {
  const response = await honoClient.api.admin.waitlist.entries.$get({
    query: {
      page: String(input.page),
      perPage: String(input.perPage),
      q: input.q,
      status: input.status,
      hasAccount: input.hasAccount,
    },
  });
  if (!response.ok) throw await parseApiError(response, "Could not load the waitlist");
  return response.json();
}

export type AdminWaitlistResponse = Awaited<ReturnType<typeof fetchAdminWaitlistEntries>>;
export type AdminWaitlistEntry = AdminWaitlistResponse["items"][number];

export function adminWaitlistQueryOptions(input: AdminWaitlistFilters) {
  return queryOptions({
    queryKey: ["waitlist", "admin", "list", input],
    queryFn: () => fetchAdminWaitlistEntries(input),
  });
}

export type AdminWaitlistStats = Awaited<ReturnType<typeof fetchAdminWaitlistStats>>;

async function fetchAdminWaitlistStats() {
  const response = await honoClient.api.admin.waitlist.stats.$get();
  if (!response.ok) throw await parseApiError(response, "Could not load waitlist stats");
  return response.json();
}

export const adminWaitlistStatsQueryOptions = queryOptions({
  queryKey: ["waitlist", "admin", "stats"],
  queryFn: fetchAdminWaitlistStats,
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
    mutationFn: async (input: { id: string; patch: AdminWaitlistPatch }) => {
      const response = await honoClient.api.admin.waitlist.entries[":id"].$patch({
        param: { id: input.id },
        json: input.patch,
      });
      if (!response.ok) throw await parseApiError(response, "Could not update the entry");
      return response.json();
    },
    meta: { invalidates: [["waitlist"]] },
  });
}
