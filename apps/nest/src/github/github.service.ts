import { Inject, Injectable, BadGatewayException } from '@nestjs/common';
import { account } from '@repo/db/postgres/schema/auth-schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import { githubRepoSchema, type GithubSearchParams } from './github.dto.js';
import { buildGithubSearchQuery } from './github-search-query.js';

const GITHUB_API_ORIGIN = 'https://api.github.com';
const githubUserSchema = z.object({ login: z.string() });
const githubSearchResponseSchema = z.object({
  items: z.array(githubRepoSchema),
  total_count: z.number(),
  incomplete_results: z.boolean(),
});

async function readGithubJson<T>({
  response,
  schema,
}: {
  response: Response;
  schema: z.ZodType<T>;
}): Promise<T> {
  if (!response.ok) throw new BadGatewayException('GitHub request failed');
  try {
    return schema.parse(await response.json());
  } catch {
    throw new BadGatewayException('GitHub returned an invalid response');
  }
}

@Injectable()
export class GithubService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listRepositories({ userId }: { userId: string }) {
    const token = await this.accessToken({ userId });
    if (!token) return { repos: [], hasToken: false };

    const response = await fetch(
      `${GITHUB_API_ORIGIN}/user/repos?per_page=100&sort=updated&direction=desc`,
      {
        headers: this.headers(token),
      },
    );
    const repos = await readGithubJson({
      response,
      schema: z.array(githubRepoSchema),
    });
    return { repos, hasToken: true };
  }

  async searchRepositories({
    userId,
    params,
  }: {
    userId: string;
    params: GithubSearchParams;
  }) {
    const token = await this.accessToken({ userId });
    if (!token) {
      return {
        repos: [],
        totalCount: 0,
        incompleteResults: false,
        hasToken: false,
      };
    }

    const userResponse = await fetch(`${GITHUB_API_ORIGIN}/user`, {
      headers: this.headers(token),
    });
    const user = await readGithubJson({
      response: userResponse,
      schema: githubUserSchema,
    });
    const search = new URLSearchParams({
      q: buildGithubSearchQuery({ login: user.login, params }),
      per_page: '100',
      order: params.order,
    });
    if (params.sort !== 'best-match') search.set('sort', params.sort);

    const response = await fetch(
      `${GITHUB_API_ORIGIN}/search/repositories?${search}`,
      {
        headers: this.headers(token),
      },
    );
    const result = await readGithubJson({
      response,
      schema: githubSearchResponseSchema,
    });
    return {
      repos: result.items,
      totalCount: result.total_count,
      incompleteResults: result.incomplete_results,
      hasToken: true,
    };
  }

  private async accessToken({ userId }: { userId: string }) {
    const [row] = await this.db
      .select({ accessToken: account.accessToken })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, 'github')))
      .limit(1);
    return row?.accessToken;
  }

  private headers(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }
}
