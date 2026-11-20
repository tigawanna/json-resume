import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { honoClient } from "@/lib/hono/client";
import { parseApiError } from "@/lib/hono/parse-api-error";
import type { queryKeyPrefixes } from "@/data-access-layer/query-keys";

type CreditsKey = (typeof queryKeyPrefixes)["credits"];
type WalletKey = (typeof queryKeyPrefixes)["wallet"];

export type CreditWalletResponse = {
  monthly: number;
  bonus: number;
  available: number;
  monthlyPeriodKey: string | null;
  /** ISO instant when the monthly bucket resets. */
  resetsAt: string;
  waitlistJoined: boolean;
  policy: { monthlyCredits: number; resumeCost: number; requireWaitlist: boolean };
};

/** The viewer's wallet. Reading it lazily allocates the current month. */
export const creditWalletQueryOptions = queryOptions({
  queryKey: ["wallet"] satisfies [WalletKey],
  queryFn: async (): Promise<CreditWalletResponse> => {
    const response = await honoClient.api.wallet.$get();
    if (!response.ok) throw await parseApiError(response, "Could not load your credits");
    return response.json();
  },
});

export type CreditLedgerFilters = {
  page: number;
  perPage: number;
};

export type CreditLedgerResponse = {
  items: Array<{
    id: string;
    bucket: string;
    type: string;
    amount: number;
    periodKey: string | null;
    resumeId: string | null;
    reason: string | null;
    createdAt: string;
  }>;
  pagination: { page: number; perPage: number; total: number; totalPages: number };
  periodKey: string;
};

export function creditLedgerQueryOptions(input: CreditLedgerFilters) {
  return queryOptions({
    queryKey: ["credits", input] satisfies [CreditsKey, ...unknown[]],
    queryFn: async (): Promise<CreditLedgerResponse> => {
      const response = await honoClient.api.credits.$get({
        query: { page: String(input.page), perPage: String(input.perPage) },
      });
      if (!response.ok) throw await parseApiError(response, "Could not load your ledger");
      return response.json();
    },
  });
}

export function adminUserWalletQueryOptions(input: { userId: string }) {
  return queryOptions({
    queryKey: ["wallet", "admin", input.userId] satisfies [WalletKey, ...string[]],
    queryFn: async () => {
      const response = await honoClient.api.admin.wallets[":userId"].$get({
        param: { userId: input.userId },
      });
      if (!response.ok) throw await parseApiError(response, "Could not load the user's wallet");
      return response.json();
    },
  });
}

export function adminUserCreditsQueryOptions(input: {
  userId: string;
  page: number;
  perPage: number;
}) {
  return queryOptions({
    queryKey: ["credits", "admin", input] satisfies [CreditsKey, ...unknown[]],
    queryFn: async () => {
      const response = await honoClient.api.admin.wallets[":userId"].credits.$get({
        param: { userId: input.userId },
        query: { page: String(input.page), perPage: String(input.perPage) },
      });
      if (!response.ok) throw await parseApiError(response, "Could not load the user's credits");
      return response.json();
    },
  });
}

export type AdminGrantInput = {
  userId: string;
  amount: number;
  reason: string;
};

/** Bonus credits. Bonus carries over; monthly resets each UTC month. */
export function adminGrantCreditsMutationOptions() {
  return mutationOptions({
    mutationKey: ["credits", "admin", "grant"],
    mutationFn: async (input: AdminGrantInput) => {
      const response = await honoClient.api.admin.wallets[":userId"].credits.$post({
        param: { userId: input.userId },
        json: { amount: input.amount, reason: input.reason },
      });
      if (!response.ok) throw await parseApiError(response, "Could not grant credits");
      return response.json();
    },
    meta: { invalidates: [["credits"], ["wallet"]] },
  });
}

export type AdminAdjustInput = {
  userId: string;
  bucket: "monthly" | "bonus";
  /** Signed: negative removes credits. */
  amount: number;
  reason: string;
};

export function adminAdjustCreditsMutationOptions() {
  return mutationOptions({
    mutationKey: ["wallet", "admin", "adjust"],
    mutationFn: async (input: AdminAdjustInput) => {
      const response = await honoClient.api.admin.wallets[":userId"].$patch({
        param: { userId: input.userId },
        json: { bucket: input.bucket, amount: input.amount, reason: input.reason },
      });
      if (!response.ok) throw await parseApiError(response, "Could not adjust credits");
      return response.json();
    },
    meta: { invalidates: [["credits"], ["wallet"]] },
  });
}
