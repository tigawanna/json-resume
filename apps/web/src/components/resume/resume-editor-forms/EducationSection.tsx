import { PickFromExistingDialog } from "@/components/PickFromExistingDialog";
import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Library, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

interface EducationSectionProps {
  resumeId: string;
}

export function EducationSection({ resumeId }: EducationSectionProps) {
  const { resume, searches, createEducation } = useResumeWorkspace();
  const searchEducation = searches?.education;
  const queryClient = useQueryClient();

  const [pickOpen, setPickOpen] = useState(false);

  const pickMutation = useMutation({
    mutationFn: async (rawItems: { school: string; degree: string; field: string }[]) =>
      Promise.all(
        rawItems.map((edu) =>
          createEducation({
            school: edu.school,
            degree: edu.degree,
            field: edu.field,
            startDate: "",
            endDate: "",
            description: "",
          }),
        ),
      ),
    onSuccess(_, rawItems) {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
      toast.success(
        `Added ${rawItems.length} education entr${rawItems.length === 1 ? "y" : "ies"}`,
      );
      setPickOpen(false);
    },
    onError(err: unknown) {
      toast.error("Failed to add education entries", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  if (!resume) return null;

  return (
    <div className="flex flex-col gap-4" data-test="education-section">
      {resume.education.map((edu) => (
        <EducationCard
          key={edu.id}
          education={edu}
          resumeId={resume.id}
          allEducation={resume.education}
        />
      ))}

      <div className="flex gap-2">
        <AddEducationForm
          resumeId={resume.id}
          existingCount={resume.education.length}
          allEducation={resume.education}
        />
        {searchEducation && (
          <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
            <Library className="mr-1 size-3" /> Pick from Existing
          </Button>
        )}
      </div>

      {searchEducation && (
        <PickFromExistingDialog
          open={pickOpen}
          onOpenChange={setPickOpen}
          title="Pick from Existing Education"
          description="Search across all your resumes to copy an education entry."
          multi
          getSearchQueryKey={(q) => [queryKeyPrefixes.resumes, "search", "education", q]}
          getSearchQueryFn={(q) => () => searchEducation(q)}
          mapToItems={(data) =>
            data.map((edu) => ({
              id: edu.id,
              primary: `${edu.degree} in ${edu.field}`,
              secondary: edu.school,
            }))
          }
          onPick={(_, rawItems) => pickMutation.mutate(rawItems)}
        />
      )}
    </div>
  );
}

// ─── Single Education Card (editable) ───────────────────────

function EducationCard({
  education,
  resumeId,
  allEducation,
}: {
  education: ResumeDetailDTO["education"][number];
  resumeId: string;
  allEducation: ResumeDetailDTO["education"];
}) {
  const { updateEducation, deleteEducation } = useResumeWorkspace();
  const [editing, setEditing] = useState(false);
  const [school, setSchool] = useState(education.school);
  const [degree, setDegree] = useState(education.degree);
  const [field, setField] = useState(education.field);
  const [startDate, setStartDate] = useState(education.startDate);
  const [endDate, setEndDate] = useState(education.endDate);
  const [description, setDescription] = useState(education.description);

  const deleteMutation = useMutation({
    mutationFn: async () => deleteEducation(education.id),
    onSuccess() {
      toast.success("Education removed");
    },
    onError(err: unknown) {
      toast.error("Failed to remove education", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["education"]] },
  });

  const saveMutation = useMutation({
    mutationFn: async () =>
      updateEducation(education.id, { school, degree, field, startDate, endDate, description }),
    onSuccess() {
      toast.success("Education saved");
      setEditing(false);
    },
    onError(err: unknown) {
      toast.error("Failed to save education", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["education"]] },
  });

  if (!editing) {
    return (
      <Card data-test={`education-card-${education.id}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            {education.degree}
            {education.field ? ` in ${education.field}` : ""}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">
            {education.school}
            {education.startDate && education.endDate
              ? ` · ${education.startDate} – ${education.endDate}`
              : education.endDate
                ? ` · ${education.endDate}`
                : ""}
          </p>
          {education.description && <p className="mt-1 text-sm">{education.description}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-test={`education-card-${education.id}`}>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">School</Label>
            <Input value={school} onChange={(e) => setSchool(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Qualification</Label>
            <Input value={degree} onChange={(e) => setDegree(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Field of Study</Label>
          <Input value={field} onChange={(e) => setField(e.target.value)} className="mt-1" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Start Date</Label>
            <Input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">End Date</Label>
            <Input value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
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
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !school.trim() || !degree.trim()}
          >
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

// ─── Add Education Form ─────────────────────────────────────

const addEduOpts = formOptions({
  defaultValues: {
    school: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
    description: "",
  },
});

function AddEducationForm({
  resumeId,
  existingCount,
  allEducation,
}: {
  resumeId: string;
  existingCount: number;
  allEducation: ResumeDetailDTO["education"];
}) {
  const { createEducation } = useResumeWorkspace();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: typeof addEduOpts.defaultValues) => createEducation(values),
    onSuccess() {
      toast.success("Education added");
      setOpen(false);
    },
    onError(err: unknown) {
      toast.error("Failed to add education", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["education"]] },
  });

  const form = useAppForm({
    ...addEduOpts,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 size-3" /> Add Education
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

            void form.handleSubmit();
          }}
          className="flex flex-col gap-3"
          data-test="add-education-form"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.AppField name="school" validators={{ onChange: z.string().min(1, "Required") }}>
              {(field) => <field.TextField label="School" />}
            </form.AppField>
            <form.AppField name="degree" validators={{ onChange: z.string().min(1, "Required") }}>
              {(field) => <field.TextField label="Qualification" />}
            </form.AppField>
          </div>
          <form.AppField name="field">
            {(field) => <field.TextField label="Field of Study" />}
          </form.AppField>
          <div className="grid gap-3 sm:grid-cols-2">
            <form.AppField name="startDate">
              {(field) => <field.TextField label="Start Date" />}
            </form.AppField>
            <form.AppField name="endDate">
              {(field) => <field.TextField label="End Date" />}
            </form.AppField>
          </div>
          <form.AppField name="description">
            {(field) => <field.TextAreaField label="Description" />}
          </form.AppField>
          <div className="flex gap-2">
            <form.AppForm>
              <form.SubmitButton label="Add" />
            </form.AppForm>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
