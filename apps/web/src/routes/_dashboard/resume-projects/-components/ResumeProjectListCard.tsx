import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ResumeProjectListItemDTO } from "@/data-access-layer/resume/resume-projects/resume-project.types";
import { FolderKanban, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ProjectEditForm } from "./ProjectEditForm";

function parseTechTags(tech: string): string[] {
  try {
    const parsed: unknown = JSON.parse(tech);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

interface ResumeProjectListCardProps {
  project: ResumeProjectListItemDTO;
  onDelete?: (id: string) => void;
}

export function ResumeProjectListCard({ project, onDelete }: ResumeProjectListCardProps) {
  const [open, setOpen] = useState(false);
  const displayTags = parseTechTags(project.tech);

  return (
    <>
      <Card
        className="flex flex-row items-start gap-2 py-6"
        data-test={`project-card-${project.id}`}
      >
        <CardHeader className="min-w-0 flex-1 space-y-0 p-0 px-6 pr-3 pb-0">
          <div className="flex min-w-0 items-start gap-3">
            <FolderKanban className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{project.name}</CardTitle>
              {project.description && (
                <CardDescription className="mt-1 line-clamp-2 text-xs">
                  {project.description}
                </CardDescription>
              )}
              {displayTags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {displayTags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              <Badge variant="outline" className="mt-2 max-w-48 truncate text-xs">
                {project.resumeName}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <div className="flex shrink-0 flex-col gap-0.5 pr-6">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => setOpen(true)}
            data-test="project-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => onDelete?.(project.id)}
            data-test="project-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <ProjectEditForm project={project} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
