import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  searchGithubRepos,
  type GithubRepo,
} from "@/data-access-layer/github/repos.functions";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { authClient } from "@/lib/better-auth/client";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  Code2,
  Github,
  Loader,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adoptSavedProjects } from "../../-utils/adopt-saved-projects";
import { joinSearchable, libraryRowBase } from "../../-utils/row-helpers";
import { REPO_PAGE_ROUTEID } from "./constants";
import { ReposFilters } from "./ReposFilters";
import type { RepoSearchFilters } from "./repos-search-query";

const routeApi = getRouteApi(REPO_PAGE_ROUTEID);

const GITHUB_REPOS_QUERY_CACHE_MS = 24 * 60 * 60 * 1000;

function githubReposQueryOptions(filters: RepoSearchFilters) {
  const minStars = filters.minStars ? Number(filters.minStars) : undefined;

  return queryOptions({
    queryKey: [queryKeyPrefixes.githubRepos, "search", filters] as const,
    staleTime: GITHUB_REPOS_QUERY_CACHE_MS,
    gcTime: GITHUB_REPOS_QUERY_CACHE_MS,
    queryFn: () =>
      searchGithubRepos({
        data: {
          query: filters.query,
          language: filters.language,
          topic: filters.topic,
          minStars: Number.isFinite(minStars) ? minStars : undefined,
          fork: filters.fork,
          archived: filters.archived,
          sort: filters.sort,
          order: filters.order,
        },
      }),
  });
}

export function ReposPage() {
  const db = useEventSourcedDb();
  const filters = routeApi.useSearch();

  useEffect(() => {
    adoptSavedProjects(db);
  }, [db]);
  const reposQuery = useQuery(githubReposQueryOptions(filters));
  const repos = reposQuery.data?.repos || [];

  if (reposQuery.data && !reposQuery.data.hasToken) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <div className="text-center">
          <Github className="mx-auto mb-4 size-16 text-muted-foreground" />
          <h2 className="mb-2 text-2xl font-bold">Connect GitHub</h2>
          <p className="mb-6 text-muted-foreground">
            Connect your GitHub account to browse and shortlist repositories for your resume.
          </p>
          <GitHubConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-test="github-repos-page">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">GitHub Repositories</h1>
      </div>

      <ReposFilters />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{reposQuery.data?.totalCount ?? repos.length} matched</Badge>
        <span>{repos.length} shown</span>
        {reposQuery.data?.incompleteResults ? (
          <span>GitHub marked this search incomplete.</span>
        ) : null}
        {reposQuery.isFetching ? (
          <span className="inline-flex items-center gap-2">
            <Loader className="size-4 animate-spin" />
            Searching
          </span>
        ) : null}
      </div>

      <div className="grid gap-4">
        {reposQuery.isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader className="size-5 animate-spin" />
              Loading repositories
            </CardContent>
          </Card>
        ) : repos.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="mb-4 size-12 text-muted-foreground" />
              <p className="text-muted-foreground">No repositories match this search.</p>
            </CardContent>
          </Card>
        ) : (
          repos.map((repo: GithubRepo) => <RepoCard key={repo.id} repo={repo} />)
        )}
      </div>
    </div>
  );
}

function RepoCard({ repo }: { repo: GithubRepo }) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const repoUrl = repo.html_url || "";

  const { data: savedMatches } = useLiveQuery(
    (q) =>
      q
        .from({ projects: db.collections.resumeProject })
        .where(({ projects }) => eq(projects.url, repoUrl)),
    [repoUrl],
  );

  const savedProject = savedMatches?.[0];
  const isSaved = !!savedProject;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const userId = viewer.user?.id;
      if (!userId) throw new Error("Sign in to save projects");
      const name = repo.name || "";
      const description = repo.description || "";
      const tech = JSON.stringify(repo.topics || []);
      const base = libraryRowBase(userId);
      db.collections.resumeProject.insert({
        ...base,
        name,
        url: repoUrl,
        homepageUrl: repo.homepage || "",
        description,
        tech,
        searchableText: joinSearchable(name, description, tech, repoUrl),
      });
    },
    onSuccess() {
      toast.success("Project saved", { description: "Added to your shortlist" });
    },
    onError(err: unknown) {
      toast.error("Failed to save project", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: async () => {
      if (!savedProject) return;
      db.collections.resumeProject.delete(savedProject.id);
    },
    onSuccess() {
      toast.success("Project removed", { description: "Removed from your shortlist" });
    },
    onError(err: unknown) {
      toast.error("Failed to remove project", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const isToggling = saveMutation.isPending || unsaveMutation.isPending;

  return (
    <Card className="transition-shadow hover:shadow-md" data-test="repo-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <a
                href={repo.html_url || ""}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-lg font-semibold hover:text-primary hover:underline"
                title={repo.full_name}
              >
                {repo.name}
              </a>
              {repo.private ? (
                <Badge variant="outline" className="text-xs">
                  Private
                </Badge>
              ) : null}
              {repo.fork ? (
                <Badge variant="secondary" className="text-xs">
                  Fork
                </Badge>
              ) : null}
            </div>
            {repo.description ? (
              <CardDescription className="line-clamp-2">{repo.description}</CardDescription>
            ) : null}
          </div>
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={() => (isSaved ? unsaveMutation.mutate() : saveMutation.mutate())}
            disabled={isToggling}
            className="shrink-0"
            data-test="repo-save-toggle"
          >
            {isToggling ? (
              <Loader className="size-4 animate-spin" />
            ) : isSaved ? (
              <>
                <BookmarkCheck className="size-4" />
                Unsave
              </>
            ) : (
              <>
                <Bookmark className="size-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {repo.language ? (
              <div className="flex items-center gap-1">
                <Code2 className="size-4" />
                <span>{repo.language}</span>
              </div>
            ) : null}
            {repo.stargazers_count !== undefined && repo.stargazers_count > 0 ? (
              <div className="flex items-center gap-1">
                <Star className="size-4" />
                <span>{repo.stargazers_count}</span>
              </div>
            ) : null}
          </div>

          {repo.topics && repo.topics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {repo.topics.slice(0, 10).map((topic: string) => (
                <Badge key={topic} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <a
              href={repo.html_url || ""}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View on GitHub
            </a>
            {repo.homepage ? (
              <>
                <span className="text-muted-foreground">/</span>
                <a
                  href={repo.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Visit website
                </a>
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GitHubConnectButton() {
  const [isPending, setIsPending] = useState(false);

  const handleConnect = async () => {
    setIsPending(true);
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: window.location.href,
      });
    } catch (error) {
      console.error("GitHub login error:", error);
      toast.error("Failed to connect GitHub", {
        description: unwrapUnknownError(error).message,
      });
      setIsPending(false);
    }
  };

  return (
    <Button onClick={handleConnect} disabled={isPending} size="lg" className="gap-2">
      {isPending ? <Loader className="size-4 animate-spin" /> : <Github className="size-4" />}
      Connect with GitHub
    </Button>
  );
}
