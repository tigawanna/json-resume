import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { deleteResume } from "@/data-access-layer/resume/resume.functions";
import type { ResumeListItemDTO } from "@/data-access-layer/resume/resume.types";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ResumeListCardProps {
  resume: ResumeListItemDTO;
  onClone?: (resumeId: string) => void;
}

export function ResumeListCard({ resume, onClone }: ResumeListCardProps) {
  const deleteMutation = useMutation({
    mutationFn: async () => deleteResume({ data: { id: resume.id } }),
    onSuccess() {
      toast.success("Resume deleted");
    },
    onError(err: unknown) {
      toast.error("Failed to delete resume", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card className="group relative" data-test={`resume-card-${resume.id}`}>
          <Link to="/resumes/$resumeId" params={{ resumeId: resume.id }} className="block">
            <CardHeader>
              <div className="flex items-start gap-3">
                <FileText className="text-primary mt-0.5 size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base">{resume.name}</CardTitle>
                  {resume.headline && (
                    <CardDescription className="mt-1 line-clamp-2 text-xs">
                      {resume.headline}
                    </CardDescription>
                  )}
                  <p className="text-muted-foreground mt-2 text-xs">
                    Updated {new Date(resume.updatedAt).toLocaleDateString()}
                  </p>
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
              deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
            data-test="resume-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => onClone?.(resume.id)}
          className="gap-2"
          data-test="resume-clone-btn"
        >
          <Copy className="size-4" />
          Clone Resume
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="text-destructive gap-2"
          data-test="resume-context-delete-btn"
        >
          <Trash2 className="size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
