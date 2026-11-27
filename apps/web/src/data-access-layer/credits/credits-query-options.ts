import {
  adminCreditsControllerAdjust,
  adminCreditsControllerGrant,
  adminCreditsControllerLedger,
  adminCreditsControllerRead,
  creditsControllerCheck,
  creditsControllerLedger,
  creditsControllerRead,
} from "@/services/nest/client";
import type {
  AdminCreditLedgerPageDto,
  AdminCreditMutationResponseDto,
  AdminWalletResponseDto,
  CreditsResponseDto,
  CreditLedgerPageDto,
  WalletCheckResponseDto,
} from "@repo/api-contracts/models";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { queryKeyPrefixes } from "@/data-access-layer/query-keys";

type CreditsKey = (typeof queryKeyPrefixes)["credits"];
type WalletKey = (typeof queryKeyPrefixes)["wallet"];

export type CreditWalletResponse = CreditsResponseDto;
export type WalletCheckResponse = WalletCheckResponseDto;

export type CreditLedgerFilters = {
  page: number;
  perPage: number;
};

export type CreditLedgerResponse = CreditLedgerPageDto;
export type AdminWalletResponse = AdminWalletResponseDto;
export type AdminCreditLedgerResponse = AdminCreditLedgerPageDto;
export type AdminCreditMutationResponse = AdminCreditMutationResponseDto;

/** The viewer's wallet. Reading it lazily allocates the current month. */
export const creditWalletQueryOptions = queryOptions({
  queryKey: ["wallet"] satisfies [WalletKey],
  queryFn: () => creditsControllerRead<true>(),
});

export function walletCheckMutationOptions() {
  return mutationOptions({
    mutationKey: ["wallet", "check"],
    mutationFn: (input: { action: "create" | "clone" | "import" | "tailor" }) =>
      creditsControllerCheck<true>({ body: input }),
  });
}

export function creditLedgerQueryOptions(input: CreditLedgerFilters) {
  return queryOptions({
    queryKey: ["credits", input] satisfies [CreditsKey, ...unknown[]],
    queryFn: () => creditsControllerLedger<true>({ query: input }),
  });
}

export function adminUserWalletQueryOptions(input: { userId: string }) {
  return queryOptions({
    queryKey: ["wallet", "admin", input.userId] satisfies [WalletKey, ...string[]],
    queryFn: () => adminCreditsControllerRead<true>({ path: input }),
  });
}

export function adminUserCreditsQueryOptions(input: {
  userId: string;
  page: number;
  perPage: number;
}) {
  return queryOptions({
    queryKey: ["credits", "admin", input] satisfies [CreditsKey, ...unknown[]],
    queryFn: () =>
      adminCreditsControllerLedger<true>({
        path: { userId: input.userId },
        query: { page: input.page, perPage: input.perPage },
      }),
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
    mutationFn: (input: AdminGrantInput) =>
      adminCreditsControllerGrant({
        path: { userId: input.userId },
        body: { amount: input.amount, reason: input.reason },
      }),
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
    mutationFn: (input: AdminAdjustInput) =>
      adminCreditsControllerAdjust({
        path: { userId: input.userId },
        body: {
          bucket: input.bucket,
          amount: input.amount,
          reason: input.reason,
        },
      }),
    meta: { invalidates: [["credits"], ["wallet"]] },
  });
}
