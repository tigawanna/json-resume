import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { resumeProjectsCollection } from "@/data-access-layer/resume/resume-projects/resume-project.collection";
import type { ResumeProjectListItemDTO } from "@/data-access-layer/resume/resume-projects/resume-project.types";
import { editProject } from "@/data-access-layer/resume/resume.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { FolderKanban, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const [name, setName] = useState(project.name);
  const [url, setUrl] = useState(project.url);
  const [homepageUrl, setHomepageUrl] = useState(project.homepageUrl);
  const [description, setDescription] = useState(project.description);
  const [techTags, setTechTags] = useState<string[]>(() => parseTechTags(project.tech));

  function resetFields() {
    setName(project.name);
    setUrl(project.url);
    setHomepageUrl(project.homepageUrl);
    setDescription(project.description);
    setTechTags(parseTechTags(project.tech));
  }

  const saveMutation = useMutation({
    mutationFn: async () =>
      editProject({
        data: { id: project.id, name, url, homepageUrl, description, tech: techTags },
      }),
    onSuccess() {
      toast.success("Project saved");
      setOpen(false);
      resumeProjectsCollection.utils.writeUpdate({
        ...project,
        name,
        url,
        homepageUrl,
        description,
        tech: JSON.stringify(techTags),
      });
    },
    onError(err: unknown) {
      toast.error("Failed to save project", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [[queryKeyPrefixes.resumeProjects], [queryKeyPrefixes.resumes]],
    },
  });

  function handleTechKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val && !techTags.includes(val)) {
        setTechTags((prev) => [...prev, val]);
        e.currentTarget.value = "";
      }
    }
  }

  const displayTags = parseTechTags(project.tech);

  return (
    <>
      <Card className="group relative" data-test={`project-card-${project.id}`}>
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
              {displayTags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {displayTags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              <Badge variant="outline" className="mt-2 text-xs">
                {project.resumeName}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => {
              resetFields();
              setOpen(true);
            }}
            data-test="project-edit-btn">
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onDelete?.(project.id)}
            data-test="project-delete-btn">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetFields(); setOpen(v); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs">Project Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Repository URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Homepage URL</Label>
                <Input
                  value={homepageUrl}
                  onChange={(e) => setHomepageUrl(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs">Technologies (press Enter to add)</Label>
              <Input onKeyDown={handleTechKeyDown} placeholder="e.g. React" className="mt-1" />
              {techTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {techTags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                      <button
                        type="button"
                        className="ml-1"
                        onClick={() => setTechTags((prev) => prev.filter((x) => x !== t))}>
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { resetFields(); setOpen(false); }}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !name.trim()}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
