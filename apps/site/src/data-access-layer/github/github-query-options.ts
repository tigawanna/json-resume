import { queryOptions } from "@tanstack/react-query";
import {
  checkGithubConnection,
  listGithubRepos,
  listPinnedProjects,
} from "./github.functions";

export const githubConnectionQueryOptions = queryOptions({
  queryKey: ["github", "connection"],
  queryFn: () => checkGithubConnection(),
});

export function githubReposQueryOptions(page: number, perPage = 30) {
  return queryOptions({
    queryKey: ["github", "repos", { page, perPage }],
    queryFn: () => listGithubRepos({ data: { page, perPage } }),
  });
}

export const pinnedProjectsQueryOptions = queryOptions({
  queryKey: ["github", "pinned-projects"],
  queryFn: () => listPinnedProjects(),
});
