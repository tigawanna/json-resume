import { PickFromExistingDialog } from "@/components/PickFromExistingDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createProject,
  editProject,
  removeProject,
  searchProjects,
} from "@/data-access-layer/resume/resume.functions";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveSuspenseQuery } from "@tanstack/react-db";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Library, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

interface ProjectSectionProps {
  resumeId: string;
}

export function ProjectSection({ resumeId }: ProjectSectionProps) {
  const { data: resume } = useLiveSuspenseQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );

  const [pickOpen, setPickOpen] = useState(false);

  if (!resume) return null;

  return (
    <div className="flex flex-col gap-4" data-test="project-section">
      {resume.projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          resumeId={resume.id}
          allProjects={resume.projects}
        />
      ))}

      <div className="flex gap-2">
        <AddProjectForm
          resumeId={resume.id}
          existingCount={resume.projects.length}
          allProjects={resume.projects}
        />
        <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
          <Library className="mr-1 size-3" /> Pick from Existing
        </Button>
      </div>

      <PickFromExistingDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        title="Pick from Existing Projects"
        description="Search across all your resumes to copy a project."
        getSearchQueryKey={(q) => ["resumes", "search", "projects", q]}
        getSearchQueryFn={(q) => () => searchProjects({ data: { query: q } })}
        mapToItems={(data) =>
          data.map((p: { id: string; name: string; description: string }) => ({
            id: p.id,
            primary: p.name,
            secondary: p.description,
          }))
        }
        onPick={(items) => {
          toast.info(`Selected ${items.length} project(s) — add them via the form`);
        }}
      />
    </div>
  );
}

// ─── Single Project Card (editable) ─────────────────────────

function ProjectCard({
  project,
  resumeId,
  allProjects,
}: {
  project: ResumeDetailDTO["projects"][number];
  resumeId: string;
  allProjects: ResumeDetailDTO["projects"];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [url, setUrl] = useState(project.url);
  const [homepageUrl, setHomepageUrl] = useState(project.homepageUrl);
  const [description, setDescription] = useState(project.description);
  const [techTags, setTechTags] = useState<string[]>(() => {
    try {
      const parsed: unknown = JSON.parse(project.tech);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => removeProject({ data: { id: project.id } }),
    onSuccess() {
      toast.success("Project removed");
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        projects: allProjects.filter((p) => p.id !== project.id),
      });
    },
    onError(err: unknown) {
      toast.error("Failed to remove project", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["resume-projects"]] },
  });

  const saveMutation = useMutation({
    mutationFn: async () =>
      editProject({
        data: {
          id: project.id,
          name,
          url,
          homepageUrl,
          description,
          tech: techTags,
        },
      }),
    onSuccess() {
      toast.success("Project saved");
      setEditing(false);
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        projects: allProjects.map((p) =>
          p.id === project.id
            ? { ...p, name, url, homepageUrl, description, tech: JSON.stringify(techTags) }
            : p,
        ),
      });
    },
    onError(err: unknown) {
      toast.error("Failed to save project", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["resume-projects"]] },
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

  if (!editing) {
    return (
      <Card data-test={`project-card-${project.id}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{project.name}</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {project.url && <p className="text-muted-foreground truncate text-xs">{project.url}</p>}
          <p className="text-sm">{project.description}</p>
          {techTags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {techTags.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-test={`project-card-${project.id}`}>
      <CardContent className="flex flex-col gap-3 pt-4">
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
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name.trim()}>
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Add Project Form ───────────────────────────────────────

const addProjectOpts = formOptions({
  defaultValues: {
    name: "",
    url: "",
    homepageUrl: "",
    description: "",
    techInput: "",
  },
});

function AddProjectForm({
  resumeId,
  existingCount,
  allProjects,
}: {
  resumeId: string;
  existingCount: number;
  allProjects: ResumeDetailDTO["projects"];
}) {
  const [open, setOpen] = useState(false);
  const [techTags, setTechTags] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async (values: typeof addProjectOpts.defaultValues) =>
      createProject({
        data: {
          resumeId,
          name: values.name,
          url: values.url || undefined,
          homepageUrl: values.homepageUrl || undefined,
          description: values.description,
          tech: techTags,
          sortOrder: existingCount,
        },
      }),
    onSuccess(data, values) {
      toast.success("Project added");
      setOpen(false);
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        projects: [
          ...allProjects,
          {
            id: data.id,
            resumeId,
            name: values.name,
            url: values.url || "",
            homepageUrl: values.homepageUrl || "",
            description: values.description,
            tech: JSON.stringify(techTags),
            sortOrder: existingCount,
          },
        ],
      });
      setTechTags([]);
    },
    onError(err: unknown) {
      toast.error("Failed to add project", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["resume-projects"]] },
  });

  const form = useAppForm({
    ...addProjectOpts,
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

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 size-3" /> Add Project
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-3"
          data-test="add-project-form">
          <form.AppField name="name" validators={{ onChange: z.string().min(1, "Required") }}>
            {(field) => <field.TextField label="Project Name" />}
          </form.AppField>
          <div className="grid gap-3 sm:grid-cols-2">
            <form.AppField name="url">
              {(field) => <field.TextField label="Repository URL" />}
            </form.AppField>
            <form.AppField name="homepageUrl">
              {(field) => <field.TextField label="Homepage URL" />}
            </form.AppField>
          </div>
          <form.AppField
            name="description"
            validators={{ onChange: z.string().min(1, "Required") }}>
            {(field) => <field.TextAreaField label="Description" />}
          </form.AppField>

          <div>
            <Label className="text-xs">Technologies (press Enter to add)</Label>
            <Input onKeyDown={handleTechKeyDown} placeholder="e.g. React" />
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

          <div className="flex gap-2">
            <form.AppForm>
              <form.SubmitButton label="Add" />
            </form.AppForm>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setTechTags([]);
              }}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
