import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { githubControllerSearchRepositories } from "@/services/nest/client";
import type {
  GithubControllerSearchRepositoriesQuery,
  GithubReposResponseDto,
} from "@repo/api-contracts/models";
import { queryOptions } from "@tanstack/react-query";

export type GithubRepo = GithubReposResponseDto["repos"][number];
export type GithubRepoFilters = Omit<GithubControllerSearchRepositoriesQuery, "minStars"> & {
  minStars?: string | number;
};

const GITHUB_REPOS_QUERY_CACHE_MS = 24 * 60 * 60 * 1000;

export function githubReposQueryOptions(filters: GithubRepoFilters) {
  const minStars = filters.minStars ? Number(filters.minStars) : undefined;
  const query = {
    ...filters,
    minStars: Number.isFinite(minStars) ? minStars : undefined,
  };
  return queryOptions({
    queryKey: [queryKeyPrefixes.githubRepos, "search", query] as const,
    staleTime: GITHUB_REPOS_QUERY_CACHE_MS,
    gcTime: GITHUB_REPOS_QUERY_CACHE_MS,
    queryFn: () => githubControllerSearchRepositories({ query }),
  });
}
