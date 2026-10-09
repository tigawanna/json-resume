import { queryOptions } from "@tanstack/react-query";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { fetchOpenRouterModelEndpoints } from "@/services/openrouter/openrouter.api";

export const openRouterModelEndpointsQueryOptions = (modelId: string) =>
  queryOptions({
    queryKey: [queryKeyPrefixes.openrouterModelEndpoints, modelId],
    queryFn: () => fetchOpenRouterModelEndpoints(modelId),
    enabled: modelId.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
