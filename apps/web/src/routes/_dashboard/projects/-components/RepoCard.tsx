import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { RepositoryResponse } from "@/data-access-layer/github/repos.octo";
import { savedProjectsCollection } from "@/data-access-layer/saved-project/saved-project.collection";
import {
  saveGithubProject,
  unsaveGithubProject,
} from "@/data-access-layer/saved-project/saved-project.functions";
import type { SavedProjectRow } from "@/data-access-layer/saved-project/saved-project.server";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, ExternalLink, GitFork, Globe, Star } from "lucide-react";
import { toast } from "sonner";

interface RepoCardProps {
  repo: RepositoryResponse;
  savedProject: SavedProjectRow | undefined;
}

export default function RepoCard({ repo, savedProject }: RepoCardProps) {
  const isSaved = !!savedProject;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      // Optimistic insert into the collection for instant UI feedback
      savedProjectsCollection.utils.writeInsert({
        id: `optimistic-${repo.id}`,
        name: repo.name,
        url: repo.html_url,
        homepageUrl: repo.homepage ?? "",
        description: repo.description ?? "",
        tech: JSON.stringify(repo.language ? [repo.language] : []),
        createdAt: now,
        updatedAt: now,
      });

      return saveGithubProject({
        data: {
          name: repo.name,
          url: repo.html_url,
          homepageUrl: repo.homepage ?? "",
          description: repo.description ?? "",
          tech: repo.language ? [repo.language] : [],
        },
      });
    },
    onSuccess() {
      toast.success(`Saved "${repo.name}" to your projects`);
    },
    onError(err: unknown) {
      toast.error("Failed to save project", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [["saved-projects"]],
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: async () => {
      // Optimistic delete from the collection for instant UI feedback
      if (savedProject) {
        savedProjectsCollection.utils.writeDelete(savedProject.id);
      }

      return unsaveGithubProject({ data: { url: repo.html_url } });
    },
    onSuccess() {
      toast.success(`Removed "${repo.name}" from saved projects`);
    },
    onError(err: unknown) {
      toast.error("Failed to remove project", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [["saved-projects"]],
    },
  });

  const isToggling = saveMutation.isPending || unsaveMutation.isPending;

  const updatedAt = repo.updated_at
    ? new Date(repo.updated_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      data-test="repo-card"
      className="group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-base-300 p-4 shadow-sm transition-all hover:border-border hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-sm font-semibold text-primary hover:underline"
              data-test="repo-link"
            >
              {repo.name}
            </a>
            {repo.fork && (
              <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                <GitFork className="size-3" />
                Fork
              </Badge>
            )}
            {repo.visibility === "private" && (
              <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                Private
              </Badge>
            )}
          </div>
          {repo.full_name && (
            <span className="truncate text-xs text-muted-foreground">{repo.full_name}</span>
          )}
        </div>

        {/* Save/Unsave button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                data-test="save-toggle"
                disabled={isToggling}
                onClick={() => (isSaved ? unsaveMutation.mutate() : saveMutation.mutate())}
                className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                  isSaved
                    ? "text-primary bg-primary/10 hover:bg-primary/20"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                } disabled:opacity-50`}
              >
                {isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{isSaved ? "Remove from saved" : "Save project"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Description */}
      {repo.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {repo.description}
        </p>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {repo.language && (
          <span className="flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-full bg-primary/70" />
            {repo.language}
          </span>
        )}
        {(repo.stargazers_count ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <Star className="size-3" />
            {repo.stargazers_count}
          </span>
        )}
        {(repo.forks_count ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <GitFork className="size-3" />
            {repo.forks_count}
          </span>
        )}
        {repo.homepage && (
          <a
            href={repo.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary"
          >
            <Globe className="size-3" />
            Site
          </a>
        )}
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-primary"
        >
          <ExternalLink className="size-3" />
          GitHub
        </a>
      </div>

      {/* Topics */}
      {repo.topics && repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {repo.topics.slice(0, 5).map((topic) => (
            <Badge key={topic} variant="secondary" className="text-[10px] px-1.5 py-0">
              {topic}
            </Badge>
          ))}
          {repo.topics.length > 5 && (
            <Badge variant="ghost" className="text-[10px] px-1.5 py-0">
              +{repo.topics.length - 5}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      {updatedAt && (
        <span className="text-[10px] text-muted-foreground/70">Updated {updatedAt}</span>
      )}
    </div>
  );
}
