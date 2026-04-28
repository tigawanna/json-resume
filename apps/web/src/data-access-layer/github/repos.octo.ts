import { getOctokit } from "@/lib/octokit";

export type GithubRepoForkFilter = "source" | "all" | "fork";
export type GithubRepoSort = "updated" | "stars" | "forks" | "help-wanted-issues" | "best-match";
export type GithubRepoOrder = "desc" | "asc";

export interface SearchRepositoriesParams {
  query?: string;
  language?: string;
  topic?: string;
  minStars?: number;
  fork?: GithubRepoForkFilter;
  archived?: "any" | "active" | "archived";
  sort?: GithubRepoSort;
  order?: GithubRepoOrder;
}

export async function getRepositories(accessToken: string) {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.request("GET /user/repos", {
    per_page: 100,
    sort: "updated",
    direction: "desc",
  });
  return data;
}

export type RepositoryResponse = Awaited<ReturnType<typeof getRepositories>>[number];

function quoteSearchValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/\s/.test(trimmed)) return trimmed;
  return `"${trimmed.replaceAll('"', '\\"')}"`;
}

function buildRepositorySearchQuery(login: string, params: SearchRepositoriesParams) {
  const parts = [`user:${login}`];
  const query = params.query?.trim();
  const language = params.language?.trim();
  const topic = params.topic?.trim();

  if (query) parts.push(query);
  if (language) parts.push(`language:${quoteSearchValue(language)}`);
  if (topic) parts.push(`topic:${quoteSearchValue(topic)}`);
  if (typeof params.minStars === "number" && params.minStars > 0) {
    parts.push(`stars:>=${params.minStars}`);
  }
  if (params.fork === "all") {
    parts.push("fork:true");
  } else if (params.fork === "fork") {
    parts.push("fork:only");
  }
  if (params.archived === "active") {
    parts.push("archived:false");
  } else if (params.archived === "archived") {
    parts.push("archived:true");
  }

  return parts.join(" ");
}

export async function searchRepositories(accessToken: string, params: SearchRepositoriesParams) {
  const octokit = getOctokit(accessToken);
  const { data: user } = await octokit.request("GET /user");
  const sort = params.sort === "best-match" ? undefined : params.sort;
  const { data } = await octokit.request("GET /search/repositories", {
    q: buildRepositorySearchQuery(user.login, params),
    sort,
    order: params.order ?? "desc",
    per_page: 100,
  });

  return {
    repos: data.items,
    totalCount: data.total_count,
    incompleteResults: data.incomplete_results,
  };
}

export type GithubSearchRepositoryResponse = Awaited<
  ReturnType<typeof searchRepositories>
>["repos"][number];
