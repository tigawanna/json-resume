import { Octokit } from "octokit";
import { serverEnv } from "./server-env";

export function getOctokit(accessToken: string) {
  return new Octokit({
    auth: accessToken,
    baseUrl: serverEnv.GITHUB_API_BASE_URL,
  });
}
