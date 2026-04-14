import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  githubReposQueryOptions,
  pinnedProjectsQueryOptions,
} from "@/data-access-layer/github/github-query-options";
import {
  pinProject,
  unpinProject,
} from "@/data-access-layer/github/github.functions";
import type { GithubRepoDTO } from "@/data-access-layer/github/github.types";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  Archive,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GitFork,
  Globe,
  Loader,
  Star,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PER_PAGE = 30;

export function ReposBrowser() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery(githubReposQueryOptions(page, PER_PAGE));
  const { data: pinnedProjects } = useSuspenseQuery(pinnedProjectsQueryOptions);

  const pinnedRepoIds = new Set(pinnedProjects.map((p) => p.githubRepoId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="size-6 animate-spin text-base-content/50" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-12 text-base-content/60">
        Failed to load repositories. Please try again.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-test="repos-browser">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.repos.map((repo) => (
          <RepoCard
            key={repo.id}
            repo={repo}
            isPinned={pinnedRepoIds.has(repo.id)}
          />
        ))}
      </div>

      {data.repos.length === 0 && (
        <div className="text-center py-12 text-base-content/60">
          No repositories found.
        </div>
      )}

      <div className="flex items-center justify-center gap-2 py-4">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft className="size-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-base-content/60 px-3">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={!data.hasMore}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function RepoCard({ repo, isPinned }: { repo: GithubRepoDTO; isPinned: boolean }) {
  const pinMutation = useMutation({
    mutationFn: () =>
      pinProject({
        data: {
          githubRepoId: repo.id,
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          repoUrl: repo.repoUrl,
          homepageUrl: repo.homepageUrl,
          topics: repo.topics,
          language: repo.language,
          stargazersCount: repo.stargazersCount,
        },
      }),
    onSuccess() {
      toast.success(`Pinned ${repo.name}`);
    },
    onError(err: unknown) {
      toast.error("Failed to pin project", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
    meta: { invalidates: [["github", "pinned-projects"]] },
  });

  const unpinMutation = useMutation({
    mutationFn: () => unpinProject({ data: { githubRepoId: repo.id } }),
    onSuccess() {
      toast.success(`Unpinned ${repo.name}`);
    },
    onError(err: unknown) {
      toast.error("Failed to unpin project", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
    meta: { invalidates: [["github", "pinned-projects"]] },
  });

  const isToggling = pinMutation.isPending || unpinMutation.isPending;

  return (
    <Card
      className="group relative transition-shadow hover:shadow-md"
      data-test="repo-card"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base flex items-center gap-1.5">
              {repo.name}
              {repo.fork && <GitFork className="size-3.5 text-base-content/40 shrink-0" />}
              {repo.archived && <Archive className="size-3.5 text-base-content/40 shrink-0" />}
            </CardTitle>
            {repo.description && (
              <CardDescription className="mt-1 line-clamp-2 text-xs">
                {repo.description}
              </CardDescription>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            disabled={isToggling}
            onClick={() =>
              isPinned ? unpinMutation.mutate() : pinMutation.mutate()
            }
            data-test="pin-toggle-btn"
          >
            {isToggling ? (
              <Loader className="size-4 animate-spin" />
            ) : isPinned ? (
              <BookmarkCheck className="size-4 text-primary" />
            ) : (
              <Bookmark className="size-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex flex-col gap-2">
        {repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {repo.topics.slice(0, 5).map((topic) => (
              <Badge key={topic} variant="secondary" className="text-[10px]">
                {topic}
              </Badge>
            ))}
            {repo.topics.length > 5 && (
              <span className="text-[10px] text-base-content/50">
                +{repo.topics.length - 5}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-base-content/60">
          {repo.language && (
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-full bg-primary" />
              {repo.language}
            </span>
          )}
          {repo.stargazersCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="size-3" />
              {repo.stargazersCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a
            href={repo.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-base-content/60 hover:text-base-content transition-colors"
          >
            <ExternalLink className="size-3" />
            Repo
          </a>
          {repo.homepageUrl && (
            <a
              href={repo.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-base-content/60 hover:text-base-content transition-colors"
            >
              <Globe className="size-3" />
              Site
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
