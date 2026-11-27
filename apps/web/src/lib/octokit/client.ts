import { Octokit } from "octokit";

export function getOctokit(accessToken: string) {
  const baseUrl = process.env.GITHUB_API_BASE_URL;
  return new Octokit({
    auth: accessToken,
    ...(baseUrl ? { baseUrl } : {}),
  });
}
