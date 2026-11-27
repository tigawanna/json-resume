import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const githubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  html_url: z.string(),
  description: z.string().nullable(),
  fork: z.boolean(),
  homepage: z.string().nullable(),
  language: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  visibility: z.string(),
  topics: z.array(z.string()),
});

export type GithubRepo = z.infer<typeof githubRepoSchema>;

const githubSearchQuery = z.object({
  query: z.string().trim().max(500).default(''),
  language: z.string().trim().max(100).default(''),
  topic: z.string().trim().max(100).default(''),
  minStars: z.coerce.number().int().nonnegative().optional(),
  fork: z.enum(['source', 'all', 'fork']).default('source'),
  archived: z.enum(['any', 'active', 'archived']).default('active'),
  sort: z
    .enum(['updated', 'stars', 'forks', 'help-wanted-issues', 'best-match'])
    .default('updated'),
  order: z.enum(['desc', 'asc']).default('desc'),
});

export type GithubSearchParams = z.infer<typeof githubSearchQuery>;
export class GithubSearchQueryDto extends createZodDto(githubSearchQuery) {}

export class GithubRepoDto extends createZodDto(githubRepoSchema) {}

const githubReposResponse = z.object({
  repos: z.array(githubRepoSchema),
  hasToken: z.boolean(),
});
export class GithubReposResponseDto extends createZodDto(githubReposResponse) {}

const githubSearchResponse = githubReposResponse.extend({
  totalCount: z.number(),
  incompleteResults: z.boolean(),
});
export class GithubSearchResponseDto extends createZodDto(
  githubSearchResponse,
) {}
