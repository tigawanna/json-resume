export interface GithubRepoDTO {
  id: number;
  name: string;
  fullName: string;
  description: string;
  repoUrl: string;
  homepageUrl: string;
  topics: string[];
  language: string;
  stargazersCount: number;
  pushedAt: string;
  fork: boolean;
  archived: boolean;
}

export interface PinnedProjectDTO {
  id: string;
  userId: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  description: string;
  repoUrl: string;
  homepageUrl: string;
  topics: string[];
  language: string;
  stargazersCount: number;
  createdAt: string;
  updatedAt: string;
}
