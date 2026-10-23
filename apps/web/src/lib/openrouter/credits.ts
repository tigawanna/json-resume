import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchOpenRouterCredits, fetchOpenRouterKeyLimits } from "@/lib/openrouter/api";

function fingerprintSecret(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${value.length}:${(hash >>> 0).toString(36)}`;
}

export const openRouterCreditsQueryOptions = (apiKey: string) =>
  queryOptions({
    queryKey: ["openrouter-credits", fingerprintSecret(apiKey)],
    queryFn: () => fetchOpenRouterCredits(apiKey),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

export function useOpenRouterCredits(apiKey: string | undefined) {
  return useQuery({
    ...openRouterCreditsQueryOptions(apiKey ?? ""),
    enabled: !!apiKey,
  });
}

export const openRouterKeyLimitsQueryOptions = (apiKey: string) =>
  queryOptions({
    queryKey: ["openrouter-key-limits", fingerprintSecret(apiKey)],
    queryFn: () => fetchOpenRouterKeyLimits(apiKey),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

export function useOpenRouterKeyLimits(apiKey: string | undefined) {
  return useQuery({
    ...openRouterKeyLimitsQueryOptions(apiKey ?? ""),
    enabled: !!apiKey,
  });
}
