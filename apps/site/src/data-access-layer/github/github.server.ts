import "@tanstack/react-start/server-only";

import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle/client";
import { pinnedProject } from "@/lib/drizzle/scheam/github-schema";
import { account } from "@/lib/drizzle/scheam/auth-schema";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { Octokit } from "octokit";
import type { GithubRepoDTO, PinnedProjectDTO } from "./github.types";

async function requireUser() {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

async function getGithubAccessToken(userId: string): Promise<string | null> {
  const rows = await db
    .select({ accessToken: account.accessToken })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "github")))
    .limit(1);
  return rows[0]?.accessToken ?? null;
}

function createOctokit(token: string) {
  return new Octokit({ auth: token });
}

export async function listGithubReposForCurrentUser(input: {
  page: number;
  perPage: number;
}): Promise<{ repos: GithubRepoDTO[]; hasMore: boolean }> {
  const user = await requireUser();
  const token = await getGithubAccessToken(user.id);
  if (!token) throw new Error("GitHub account not connected");

  const octokit = createOctokit(token);
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: "pushed",
    direction: "desc",
    per_page: input.perPage,
    page: input.page,
    type: "owner",
  });

  const repos: GithubRepoDTO[] = data.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description ?? "",
    repoUrl: r.html_url,
    homepageUrl: r.homepage ?? "",
    topics: r.topics ?? [],
    language: r.language ?? "",
    stargazersCount: r.stargazers_count ?? 0,
    pushedAt: r.pushed_at ?? "",
    fork: r.fork,
    archived: r.archived ?? false,
  }));

  return { repos, hasMore: repos.length === input.perPage };
}

function toPinnedDTO(row: typeof pinnedProject.$inferSelect): PinnedProjectDTO {
  return {
    id: row.id,
    userId: row.userId,
    githubRepoId: row.githubRepoId,
    name: row.name,
    fullName: row.fullName,
    description: row.description,
    repoUrl: row.repoUrl,
    homepageUrl: row.homepageUrl,
    topics: JSON.parse(row.topics) as string[],
    language: row.language,
    stargazersCount: row.stargazersCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPinnedProjectsForCurrentUser(): Promise<PinnedProjectDTO[]> {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(pinnedProject)
    .where(eq(pinnedProject.userId, user.id));
  return rows.map(toPinnedDTO);
}

export async function pinProjectForCurrentUser(input: {
  githubRepoId: number;
  name: string;
  fullName: string;
  description: string;
  repoUrl: string;
  homepageUrl: string;
  topics: string[];
  language: string;
  stargazersCount: number;
}): Promise<PinnedProjectDTO> {
  const user = await requireUser();

  const existing = await db
    .select()
    .from(pinnedProject)
    .where(
      and(
        eq(pinnedProject.userId, user.id),
        eq(pinnedProject.githubRepoId, input.githubRepoId),
      ),
    )
    .limit(1);

  if (existing[0]) return toPinnedDTO(existing[0]);

  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(pinnedProject).values({
    id,
    userId: user.id,
    githubRepoId: input.githubRepoId,
    name: input.name,
    fullName: input.fullName,
    description: input.description,
    repoUrl: input.repoUrl,
    homepageUrl: input.homepageUrl,
    topics: JSON.stringify(input.topics),
    language: input.language,
    stargazersCount: input.stargazersCount,
    createdAt: now,
    updatedAt: now,
  });

  const rows = await db
    .select()
    .from(pinnedProject)
    .where(eq(pinnedProject.id, id))
    .limit(1);
  return toPinnedDTO(rows[0]!);
}

export async function unpinProjectForCurrentUser(githubRepoId: number): Promise<{ success: true }> {
  const user = await requireUser();
  await db
    .delete(pinnedProject)
    .where(
      and(
        eq(pinnedProject.userId, user.id),
        eq(pinnedProject.githubRepoId, githubRepoId),
      ),
    );
  return { success: true };
}

export async function updatePinnedProjectForCurrentUser(input: {
  id: string;
  description?: string;
  topics?: string[];
}): Promise<PinnedProjectDTO> {
  const user = await requireUser();

  const existing = await db
    .select()
    .from(pinnedProject)
    .where(and(eq(pinnedProject.id, input.id), eq(pinnedProject.userId, user.id)))
    .limit(1);
  if (!existing[0]) throw new Error("Pinned project not found");

  const updates: Record<string, string> = {};
  if (input.description !== undefined) updates.description = input.description;
  if (input.topics !== undefined) updates.topics = JSON.stringify(input.topics);

  if (Object.keys(updates).length > 0) {
    await db
      .update(pinnedProject)
      .set(updates)
      .where(and(eq(pinnedProject.id, input.id), eq(pinnedProject.userId, user.id)));
  }

  const rows = await db
    .select()
    .from(pinnedProject)
    .where(eq(pinnedProject.id, input.id))
    .limit(1);
  return toPinnedDTO(rows[0]!);
}

export async function checkGithubConnectionForCurrentUser(): Promise<{ connected: boolean }> {
  const user = await requireUser();
  const token = await getGithubAccessToken(user.id);
  return { connected: !!token };
}
