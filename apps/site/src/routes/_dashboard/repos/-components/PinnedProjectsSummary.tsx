import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { pinnedProjectsQueryOptions } from "@/data-access-layer/github/github-query-options";
import { unpinProject } from "@/data-access-layer/github/github.functions";
import type { PinnedProjectDTO } from "@/data-access-layer/github/github.types";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BookmarkCheck,
  ExternalLink,
  Globe,
  Loader,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";

export function PinnedProjectsSummary() {
  const { data: pinned } = useSuspenseQuery(pinnedProjectsQueryOptions);

  if (pinned.length === 0) return null;

  return (
    <div className="flex flex-col gap-3" data-test="pinned-projects-summary">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <BookmarkCheck className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">
            Pinned Projects ({pinned.length})
          </h2>
        </div>
        <Button asChild variant="link" size="sm" className="text-xs">
          <Link to="/repos/pinned">Manage all</Link>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pinned.map((project) => (
          <PinnedProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

function PinnedProjectCard({ project }: { project: PinnedProjectDTO }) {
  const unpinMutation = useMutation({
    mutationFn: () =>
      unpinProject({ data: { githubRepoId: project.githubRepoId } }),
    onSuccess() {
      toast.success(`Unpinned ${project.name}`);
    },
    onError(err: unknown) {
      toast.error("Failed to unpin", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
    meta: { invalidates: [["github", "pinned-projects"]] },
  });

  return (
    <Card className="relative" data-test="pinned-project-card">
      <CardHeader className="pb-1.5 pt-3 px-3">
        <div className="flex items-start justify-between gap-1">
          <CardTitle className="truncate text-sm">{project.name}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            disabled={unpinMutation.isPending}
            onClick={() => unpinMutation.mutate()}
          >
            {unpinMutation.isPending ? (
              <Loader className="size-3 animate-spin" />
            ) : (
              <X className="size-3" />
            )}
          </Button>
        </div>
        {project.description && (
          <CardDescription className="line-clamp-1 text-[11px]">
            {project.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 flex flex-col gap-1.5">
        {project.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.topics.slice(0, 3).map((topic) => (
              <Badge key={topic} variant="secondary" className="text-[9px] px-1 py-0">
                {topic}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] text-base-content/60">
          {project.language && <span>{project.language}</span>}
          {project.stargazersCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="size-2.5" />
              {project.stargazersCount}
            </span>
          )}
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 hover:text-base-content transition-colors ml-auto"
          >
            <ExternalLink className="size-2.5" />
          </a>
          {project.homepageUrl && (
            <a
              href={project.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 hover:text-base-content transition-colors"
            >
              <Globe className="size-2.5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
