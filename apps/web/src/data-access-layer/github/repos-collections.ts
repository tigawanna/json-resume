import { tanstackDBPersistence } from "@/lib/tanstack/db/browser-presistor";
import { queryClient } from "@/lib/tanstack/query/queryclient";
import { githubControllerListRepositories } from "@/services/nest/client";
import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions, type QueryCollectionUtils } from "@tanstack/query-db-collection";
import { redirect } from "@tanstack/react-router";
import { queryKeyPrefixes } from "../query-keys";
import type { GithubRepo } from "./repos-query-options";
import { githubAuthRedirect } from "./auth";

export const githubReposCollection = createCollection(
  persistedCollectionOptions<
    GithubRepo,
    number,
    never,
    QueryCollectionUtils<GithubRepo, number, GithubRepo, unknown>
  >({
    persistence: tanstackDBPersistence,
    schemaVersion: 1,
    ...queryCollectionOptions({
      queryKey: [queryKeyPrefixes.github, "repos"] as const,
      queryFn: async () => {
        const result = await githubControllerListRepositories();
        if (!result.hasToken) throw redirect(githubAuthRedirect);
        return result.repos;
      },
      getKey: (item) => item.id,
      queryClient,
    }),
  }),
);
