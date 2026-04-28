import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { db } from "@/lib/drizzle/client";
import { account } from "@/lib/drizzle/scheam";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import {
  searchRepositories,
  type GithubRepoForkFilter,
  type GithubRepoOrder,
  type GithubRepoSort,
  type GithubSearchRepositoryResponse,
  type SearchRepositoriesParams,
} from "./repos.octo";

export type { GithubRepoForkFilter, GithubRepoOrder, GithubRepoSort };

function normalizeSearchParams(input?: SearchRepositoriesParams): SearchRepositoriesParams {
  return {
    query: input?.query?.trim() ?? "",
    language: input?.language?.trim() ?? "",
    topic: input?.topic?.trim() ?? "",
    minStars: input?.minStars,
    fork: input?.fork ?? "source",
    archived: input?.archived ?? "active",
    sort: input?.sort ?? "updated",
    order: input?.order ?? "desc",
  };
}

export const getGithubRepos = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input?: {
      query?: string;
      language?: string;
      topic?: string;
      minStars?: number;
      fork?: GithubRepoForkFilter;
      archived?: "any" | "active" | "archived";
      sort?: GithubRepoSort;
      order?: GithubRepoOrder;
    }) => input,
  )
  .handler(async ({ context }) => {
    const userId = context.viewer.user.id;

    // Get GitHub access token from account table
    const githubAccount = await db.query.account.findFirst({
      where: and(eq(account.userId, userId), eq(account.providerId, "github")),
    });

    if (!githubAccount?.accessToken) {
      return { repos: [], hasToken: false };
    }

    try {
      const result = await searchRepositories(githubAccount.accessToken, normalizeSearchParams());
      return { ...result, hasToken: true };
    } catch (error) {
      console.error("Failed to fetch GitHub repos:", error);
      throw error;
    }
  });

export const searchGithubRepos = createServerFn({ method: "GET" })
  .middleware([viewerMiddleware])
  .inputValidator(
    (input?: {
      query?: string;
      language?: string;
      topic?: string;
      minStars?: number;
      fork?: GithubRepoForkFilter;
      archived?: "any" | "active" | "archived";
      sort?: GithubRepoSort;
      order?: GithubRepoOrder;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const userId = context.viewer.user.id;

    const githubAccount = await db.query.account.findFirst({
      where: and(eq(account.userId, userId), eq(account.providerId, "github")),
    });

    if (!githubAccount?.accessToken) {
      return { repos: [], totalCount: 0, incompleteResults: false, hasToken: false };
    }

    try {
      const result = await searchRepositories(
        githubAccount.accessToken,
        normalizeSearchParams(data),
      );
      return { ...result, hasToken: true };
    } catch (error) {
      console.error("Failed to search GitHub repos:", error);
      throw error;
    }
  });

export type GithubRepo = GithubSearchRepositoryResponse;
