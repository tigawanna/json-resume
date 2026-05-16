import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resumeDetailToDocument } from "@/data-access-layer/resume/resume-converters";
import { deleteResumeMutationOptions } from "@/data-access-layer/resume/resume-mutatin-options";
import { resumeDetailQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import type { ResumeListItemDTO } from "@/data-access-layer/resume/resume.types";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClipboardCopy, FileText, GitFork, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ResumeListCardProps {
  resume: ResumeListItemDTO;
  onClone?: (resumeId: string) => void;
}

export function ResumeListCard({ resume, onClone }: ResumeListCardProps) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation(deleteResumeMutationOptions);
  const copyJsonMutation = useMutation({
    mutationFn: async (resumeId: string) => {
      const detail = await queryClient.ensureQueryData(resumeDetailQueryOptions(resumeId));
      if (!detail) throw new Error("Resume not found");
      const doc = resumeDetailToDocument(detail);
      await navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
    },
    onSuccess() {
      toast.success("Resume JSON copied");
    },
    onError(err: unknown) {
      toast.error("Failed to copy resume JSON", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const handleDelete = (resumeId: string) => {
    deleteMutation.mutate(resumeId);
  };

  return (
    <Card data-test={`resume-card-${resume.id}`}>
      <CardHeader className="w-full">
        <div className="flex w-full min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to="/resumes/$resumeId"
              params={{ resumeId: resume.id }}
              search={(prev) => ({ ...prev, tab: "edit" })}
              className="flex min-w-0 flex-1 items-center gap-3 no-underline outline-none"
            >
              <FileText className="text-primary size-5 shrink-0" />
              <CardTitle className="min-w-0 flex-1 truncate text-base leading-tight">
                {resume.name}
              </CardTitle>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground size-8 shrink-0"
                  aria-label="Resume actions"
                  data-test="resume-card-actions-trigger"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="gap-2"
                  disabled={!onClone}
                  onSelect={() => onClone?.(resume.id)}
                  data-test="resume-clone-btn"
                >
                  <GitFork className="size-4" />
                  Clone Resume
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  disabled={copyJsonMutation.isPending}
                  onSelect={() => copyJsonMutation.mutate(resume.id)}
                  data-test="resume-copy-json-btn"
                >
                  <ClipboardCopy className="size-4" />
                  Copy as JSON
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2"
                  disabled={deleteMutation.isPending}
                  onSelect={() => handleDelete(resume.id)}
                  data-test="resume-delete-btn"
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Link
            to="/resumes/$resumeId"
            params={{ resumeId: resume.id }}
            search={(prev) => ({ ...prev, tab: "edit" })}
            className="block min-w-0 space-y-2 pl-8 no-underline outline-none"
          >
            {resume.headline ? (
              <CardDescription className="min-w-0 truncate text-xs leading-normal">
                {resume.headline}
              </CardDescription>
            ) : null}
            <p className="text-muted-foreground text-xs">
              Updated {new Date(resume.updatedAt).toLocaleDateString()}
            </p>
          </Link>
        </div>
      </CardHeader>
    </Card>
  );
}
