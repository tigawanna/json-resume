import { tanstackDBPersistence } from "@/lib/tanstack/db/browser-presistor";
import { queryClient } from "@/lib/tanstack/query/queryclient";
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { getRepositories, RepositoryResponse } from "./repos.octo";
import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/better-auth/client";
import { queryKeyPrefixes } from "../query-keys";
import { redirect } from "@tanstack/react-router";

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

export const githubReposCollection = createCollection(
  persistedCollectionOptions<RepositoryResponse, number>({
    persistence: tanstackDBPersistence,
    schemaVersion: 1,
    ...queryCollectionOptions({
      queryKey: [queryKeyPrefixes.github, "repos"] as const,
      queryFn: async () => {
        const acesssTokenResponse = await authClient.getAccessToken({
          providerId: "github",
        });

        if (acesssTokenResponse.error || !acesssTokenResponse.data?.accessToken) {
          throw redirect({to:"/auth/github",search:{returnTo:"/dashboard/projects"}});
        }
        const data = await getRepositories(acesssTokenResponse.data.accessToken);
        return data;
      },
      getKey: (item) => item.id,
      queryClient: queryClient,
    }),
  }),
);
