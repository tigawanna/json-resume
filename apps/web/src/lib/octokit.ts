import { Octokit } from "octokit";

export function getOctokit(accessToken: string) {
  return new Octokit({
    auth: accessToken,
  });
}
