import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveGithubProject } from "@/data-access-layer/saved-project/saved-project.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Loader, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { SavedProject } from "./SavedProjectsPage";

function parseTechTags(tech: string | string[] | undefined): string[] {
  if (!tech) return [];
  try {
    if (typeof tech === "string") {
      return JSON.parse(tech).filter((x: unknown): x is string => typeof x === "string");
    }
    return Array.isArray(tech) ? tech.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const savedProjectEditOpts = formOptions({
  defaultValues: {
    name: "",
    url: "",
    homepageUrl: "",
    description: "",
  },
});

interface SavedProjectEditFormProps {
  project: SavedProject;
  onSuccess?: () => void;
}

export function SavedProjectEditForm({ project, onSuccess }: SavedProjectEditFormProps) {
  const [techTags, setTechTags] = useState(() => parseTechTags(project.tech));

  const mutation = useMutation({
    mutationFn: async (values: typeof savedProjectEditOpts.defaultValues) =>
      saveGithubProject({
        data: {
          name: values.name,
          url: values.url,
          homepageUrl: values.homepageUrl || "",
          description: values.description,
          tech: techTags,
        },
      }),
    onSuccess() {
      toast.success("Project updated");
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to update project", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [["saved-projects"]],
    },
  });

  const form = useAppForm({
    ...savedProjectEditOpts,
    defaultValues: {
      name: project.name,
      url: project.url,
      homepageUrl: project.homepageUrl || "",
      description: project.description || "",
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

      <form.AppField name="url">
        {(field) => (
          <div>
            <Label className="text-xs">URL (read-only)</Label>
            <Input value={field.state.value} readOnly className="mt-1 bg-muted" />
          </div>
        )}
      </form.AppField>

      <form.AppField name="homepageUrl">
        {(field) => (
          <div>
            <Label className="text-xs">Homepage URL (optional)</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>

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

      {/* Tech Tags */}
      <div>
        <Label className="text-xs">Technologies</Label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add a technology (press Enter or comma)..."
              onKeyDown={handleTechKeyDown}
              className="flex-1"
            />
            <Button type="button" size="sm" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {techTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {techTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTechTags((prev) => prev.filter((t) => t !== tag))}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="submit" disabled={mutation.isPending} className="gap-2">
          {mutation.isPending && <Loader className="w-4 h-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
