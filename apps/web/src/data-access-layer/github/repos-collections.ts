import { tanstackDBPersistence } from "@/lib/tanstack/db/browser-presistor";
import { queryClient } from "@/lib/tanstack/query/queryclient";
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { getRepositories, RepositoryResponse } from "./repos.octo";
import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/better-auth/client";
import { queryKeyPrefixes } from "../query-keys";

export const githubAccessTokenQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.githubAccessToken],
  queryFn: async () => {
    const { data, error } = await authClient.getAccessToken({
      providerId: "github",
    });
    if (error) {
      throw new Error("Failed to get GitHub access token");
    }
    return data.accessToken;
  },
});

export const shoppingItemsCollection = createCollection(
  persistedCollectionOptions<RepositoryResponse, number>({
    persistence: tanstackDBPersistence,
    schemaVersion: 1,
    ...queryCollectionOptions({
      queryKey: [queryKeyPrefixes.github, "repos"] as const,
      queryFn: async (ctx) => {
        const githubKey = ctx.client.getQueryData<string>([queryKeyPrefixes.githubAccessToken]);
        if (!githubKey) {
          throw new Error("No GitHub access token found");
        }
        const data = await getRepositories(githubKey);
        return data;
      },
      getKey: (item) => item.id,
      queryClient: queryClient,
    }),
  }),
);
