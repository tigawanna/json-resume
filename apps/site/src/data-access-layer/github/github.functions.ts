import { createServerFn } from "@tanstack/react-start";
import type { GithubRepoDTO, PinnedProjectDTO } from "./github.types";
import {
  checkGithubConnectionForCurrentUser,
  listGithubReposForCurrentUser,
  listPinnedProjectsForCurrentUser,
  pinProjectForCurrentUser,
  unpinProjectForCurrentUser,
  updatePinnedProjectForCurrentUser,
} from "./github.server";

export const checkGithubConnection = createServerFn({ method: "GET" }).handler(
  checkGithubConnectionForCurrentUser,
);

export const listGithubRepos = createServerFn({ method: "GET" })
  .inputValidator((input: { page: number; perPage: number }) => input)
  .handler(
    async ({ data }): Promise<{ repos: GithubRepoDTO[]; hasMore: boolean }> => {
      return listGithubReposForCurrentUser(data);
    },
  );

export const listPinnedProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<PinnedProjectDTO[]> => {
    return listPinnedProjectsForCurrentUser();
  },
);

export const pinProject = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      githubRepoId: number;
      name: string;
      fullName: string;
      description: string;
      repoUrl: string;
      homepageUrl: string;
      topics: string[];
      language: string;
      stargazersCount: number;
    }) => input,
  )
  .handler(async ({ data }): Promise<PinnedProjectDTO> => {
    return pinProjectForCurrentUser(data);
  });

export const unpinProject = createServerFn({ method: "POST" })
  .inputValidator((input: { githubRepoId: number }) => input)
  .handler(async ({ data }) => {
    return unpinProjectForCurrentUser(data.githubRepoId);
  });

export const updatePinnedProject = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id: string; description?: string; topics?: string[] }) => input,
  )
  .handler(async ({ data }): Promise<PinnedProjectDTO> => {
    return updatePinnedProjectForCurrentUser(data);
  });
