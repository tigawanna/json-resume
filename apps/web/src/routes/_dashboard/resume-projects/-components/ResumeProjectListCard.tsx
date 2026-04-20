import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResumeProjectListItemDTO } from "@/data-access-layer/resume/resume-projects/resume-project.types";
import { Link } from "@tanstack/react-router";
import { FolderKanban, Trash2 } from "lucide-react";

interface ResumeProjectListCardProps {
  project: ResumeProjectListItemDTO;
  onDelete?: (id: string) => void;
}

export function ResumeProjectListCard({ project, onDelete }: ResumeProjectListCardProps) {
  return (
    <Card className="group relative" data-test={`project-card-${project.id}`}>
      <Link
        to="/resumes/$resumeId"
        params={{ resumeId: project.resumeId }}
        search={(prev) => ({ ...prev, tab: "edit" })}
        className="block">
        <CardHeader>
          <div className="flex items-start gap-3">
            <FolderKanban className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{project.name}</CardTitle>
              {project.description && (
                <CardDescription className="mt-1 line-clamp-2 text-xs">
                  {project.description}
                </CardDescription>
              )}
              {project.tech && (
                <p className="text-muted-foreground mt-1 truncate text-xs">{project.tech}</p>
              )}
              <Badge variant="outline" className="mt-2 text-xs">
                {project.resumeName}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 size-7 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete?.(project.id);
        }}
        data-test="project-delete-btn">
        <Trash2 className="size-3.5" />
      </Button>
    </Card>
  );
}
