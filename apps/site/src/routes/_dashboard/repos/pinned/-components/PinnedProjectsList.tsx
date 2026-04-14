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
  unpinProject,
  updatePinnedProject,
} from "@/data-access-layer/github/github.functions";
import type { PinnedProjectDTO } from "@/data-access-layer/github/github.types";
import { useMutation } from "@tanstack/react-query";
import {
  ExternalLink,
  Globe,
  Loader,
  Pencil,
  Star,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PinnedProjectsListProps {
  projects: PinnedProjectDTO[];
}

export function PinnedProjectsList({ projects }: PinnedProjectsListProps) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-test="pinned-projects-list"
    >
      {projects.map((project) => (
        <PinnedProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

function PinnedProjectCard({ project }: { project: PinnedProjectDTO }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(project.description);

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

  const updateMutation = useMutation({
    mutationFn: (description: string) =>
      updatePinnedProject({ data: { id: project.id, description } }),
    onSuccess() {
      toast.success("Description updated");
      setIsEditing(false);
    },
    onError(err: unknown) {
      toast.error("Failed to update", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
    meta: { invalidates: [["github", "pinned-projects"]] },
  });

  return (
    <Card className="relative" data-test="pinned-project-detail-card">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="truncate text-base">{project.name}</CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => {
                setIsEditing(!isEditing);
                setEditDescription(project.description);
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              disabled={unpinMutation.isPending}
              onClick={() => unpinMutation.mutate()}
            >
              {unpinMutation.isPending ? (
                <Loader className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-2 mt-1">
            <textarea
              className="textarea textarea-bordered text-xs w-full min-h-[60px] resize-none bg-base-200 rounded-md p-2"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <div className="flex gap-1 justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => setIsEditing(false)}
              >
                <X className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate(editDescription)}
              >
                {updateMutation.isPending ? (
                  <Loader className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          project.description && (
            <CardDescription className="line-clamp-3 text-xs mt-1">
              {project.description}
            </CardDescription>
          )
        )}
      </CardHeader>

      <CardContent className="pt-0 flex flex-col gap-2">
        {project.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.topics.map((topic) => (
              <Badge key={topic} variant="secondary" className="text-[10px]">
                {topic}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-base-content/60">
          {project.language && (
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-full bg-primary" />
              {project.language}
            </span>
          )}
          {project.stargazersCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="size-3" />
              {project.stargazersCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-base-content/60 hover:text-base-content transition-colors"
          >
            <ExternalLink className="size-3" />
            Repo
          </a>
          {project.homepageUrl && (
            <a
              href={project.homepageUrl}
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
