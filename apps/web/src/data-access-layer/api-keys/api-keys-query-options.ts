import { authClient } from "@/lib/better-auth/client";
import { queryOptions } from "@tanstack/react-query";

export const apiKeysQueryOptions = queryOptions({
  queryKey: ["api-keys"],
  queryFn: async () => {
    const { data, error } = await authClient.apiKey.list({ query: {} });
    if (error) throw new Error(error.message);
    return data;
  },
});
