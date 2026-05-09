import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchOpenRouterCredits } from "@/services/openrouter/openrouter.api";

export const openRouterCreditsQueryOptions = (apiKey: string) =>
  queryOptions({
    queryKey: ["openrouter-credits", apiKey],
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
