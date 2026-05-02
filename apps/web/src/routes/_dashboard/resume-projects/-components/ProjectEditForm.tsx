import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
// import { resumeProjectsCollection } from "@/data-access-layer/resume/resume-projects/resume-project.collection";
import type { ResumeProjectListItemDTO } from "@/data-access-layer/resume/resume-projects/resume-project.types";
import { editProject } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
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

const projectEditOpts = formOptions({
  defaultValues: {
    name: "",
    url: "",
    homepageUrl: "",
    description: "",
  },
});

interface ProjectEditFormProps {
  project: ResumeProjectListItemDTO;
  onSuccess?: () => void;
}

export function ProjectEditForm({ project, onSuccess }: ProjectEditFormProps) {
  const [techTags, setTechTags] = useState(() => parseTechTags(project.tech));

  const mutation = useMutation({
    mutationFn: async (values: typeof projectEditOpts.defaultValues) =>
      editProject({
        data: { id: project.id, ...values, tech: techTags },
      }),
    onSuccess() {
      toast.success("Project saved");
      // resumeProjectsCollection.utils.writeUpdate({
      //   ...project,
      //   ...values,
      //   tech: JSON.stringify(techTags),
      // });
      onSuccess?.();
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

  const form = useAppForm({
    ...projectEditOpts,
    defaultValues: {
      name: project.name,
      url: project.url,
      homepageUrl: project.homepageUrl,
      description: project.description,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();

        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Project name is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Project Name</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>

      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField name="url">
          {(field) => (
            <div>
              <Label className="text-xs">Repository URL</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>

        <form.AppField name="homepageUrl">
          {(field) => (
            <div>
              <Label className="text-xs">Homepage URL</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
      </div>

      <form.AppField name="description">
        {(field) => (
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        )}
      </form.AppField>

      <div>
        <Label className="text-xs">Technologies (press Enter to add)</Label>
        <Input
          onKeyDown={handleTechKeyDown}
          placeholder="e.g. React"
          className="mt-1"
          disabled={mutation.isPending}
        />
        {techTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {techTags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
                <button
                  type="button"
                  className="ml-1"
                  onClick={() => setTechTags((prev) => prev.filter((x) => x !== t))}
                  disabled={mutation.isPending}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset();
            setTechTags(parseTechTags(project.tech));
          }}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending || !form.state.isFormValid}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
