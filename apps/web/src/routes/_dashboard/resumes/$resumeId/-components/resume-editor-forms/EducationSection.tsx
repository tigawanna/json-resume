import { PickFromExistingDialog } from "@/components/PickFromExistingDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createEducation,
  removeEducation,
  searchEducation,
} from "@/data-access-layer/resume/resume.functions";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Library, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

interface EducationSectionProps {
  resume: ResumeDetailDTO;
}

export function EducationSection({ resume }: EducationSectionProps) {
  const [pickOpen, setPickOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4" data-test="education-section">
      {resume.education.map((edu) => (
        <EducationCard key={edu.id} education={edu} />
      ))}

      <div className="flex gap-2">
        <AddEducationForm resumeId={resume.id} existingCount={resume.education.length} />
        <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
          <Library className="mr-1 size-3" /> Pick from Existing
        </Button>
      </div>

      <PickFromExistingDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        title="Pick from Existing Education"
        description="Search across all your resumes to copy an education entry."
        getSearchQueryKey={(q) => ["resumes", "search", "education", q]}
        getSearchQueryFn={(q) => () => searchEducation({ data: { query: q } })}
        mapToItems={(data) =>
          data.map((edu: { id: string; school: string; degree: string; field: string }) => ({
            id: edu.id,
            primary: `${edu.degree} in ${edu.field}`,
            secondary: edu.school,
          }))
        }
        onPick={(items) => {
          toast.info(`Selected ${items.length} education(s) — add them via the form`);
        }}
      />
    </div>
  );
}

// ─── Single Education Card ──────────────────────────────────

function EducationCard({ education }: { education: ResumeDetailDTO["education"][number] }) {
  const deleteMutation = useMutation({
    mutationFn: async () => removeEducation({ data: { id: education.id } }),
    onSuccess() {
      toast.success("Education removed");
    },
    onError(err: unknown) {
      toast.error("Failed to remove education", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  return (
    <Card data-test={`education-card-${education.id}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">
          {education.degree}
          {education.field ? ` in ${education.field}` : ""}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-xs">
          {education.school}
          {education.endDate ? ` · ${education.endDate}` : ""}
        </p>
        {education.description && <p className="mt-1 text-sm">{education.description}</p>}
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
}: {
  resumeId: string;
  existingCount: number;
}) {
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: typeof addEduOpts.defaultValues) =>
      createEducation({
        data: { resumeId, ...values, sortOrder: existingCount },
      }),
    onSuccess() {
      toast.success("Education added");
      setOpen(false);
    },
    onError(err: unknown) {
      toast.error("Failed to add education", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
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
            form.handleSubmit();
          }}
          className="flex flex-col gap-3"
          data-test="add-education-form"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.AppField name="school" validators={{ onChange: z.string().min(1, "Required") }}>
              {(field) => <field.TextField label="School" />}
            </form.AppField>
            <form.AppField name="degree" validators={{ onChange: z.string().min(1, "Required") }}>
              {(field) => <field.TextField label="Degree" />}
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
