import { tanstackDBPersistence } from "@/lib/tanstack/db/browser-presistor";
import { queryClient } from "@/lib/tanstack/query/queryclient";
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions, type QueryCollectionUtils } from "@tanstack/query-db-collection";
import { queryOptions } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { queryKeyPrefixes } from "../query-keys";
import { fetchGithubAccessToken, githubAuthRedirect } from "./auth";
import { getRepositories, RepositoryResponse } from "./repos.octo";

export const githubAccessTokenQueryOptions = queryOptions({
  queryKey: [queryKeyPrefixes.githubAccessToken],
  queryFn: async () => {
    const accessToken = await fetchGithubAccessToken();
    if (!accessToken) {
      throw new Error("Failed to get GitHub access token");
    }
    return accessToken;
  },
});

export const githubReposCollection = createCollection(
  persistedCollectionOptions<
    RepositoryResponse,
    number,
    never,
    QueryCollectionUtils<RepositoryResponse, number, RepositoryResponse, unknown>
  >({
    persistence: tanstackDBPersistence,
    schemaVersion: 1,
    ...queryCollectionOptions({
      queryKey: [queryKeyPrefixes.github, "repos"] as const,
      queryFn: async () => {
        const accessToken = await fetchGithubAccessToken();
        if (!accessToken) {
          throw redirect(githubAuthRedirect);
        }
        return getRepositories(accessToken);
      },
      getKey: (item) => item.id,
      queryClient: queryClient,
    }),
  }),
);
