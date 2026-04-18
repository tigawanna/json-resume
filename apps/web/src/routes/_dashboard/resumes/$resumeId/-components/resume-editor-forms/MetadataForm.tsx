import { updateResumeMeta } from "@/data-access-layer/resume/resume.functions";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

interface MetadataFormProps {
  resume: ResumeDetailDTO;
}

const formOpts = formOptions({
  defaultValues: {
    name: "",
    fullName: "",
    headline: "",
    description: "",
    jobDescription: "",
    templateId: "classic",
  },
});

export function MetadataForm({ resume }: MetadataFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: typeof formOpts.defaultValues) =>
      updateResumeMeta({ data: { id: resume.id, ...values } }),
    onSuccess() {
      toast.success("Resume updated");
    },
    onError(err: unknown) {
      toast.error("Failed to update resume", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  const form = useAppForm({
    ...formOpts,
    defaultValues: {
      name: resume.name,
      fullName: resume.fullName,
      headline: resume.headline,
      description: resume.description,
      jobDescription: resume.jobDescription,
      templateId: resume.templateId,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-4"
      data-test="metadata-form"
    >
      <form.AppField name="name" validators={{ onChange: z.string().min(1, "Name is required") }}>
        {(field) => <field.TextField label="Resume Name" />}
      </form.AppField>

      <div className="grid gap-4 sm:grid-cols-2">
        <form.AppField name="fullName">
          {(field) => <field.TextField label="Full Name" />}
        </form.AppField>

        <form.AppField name="headline">
          {(field) => <field.TextField label="Headline" />}
        </form.AppField>
      </div>

      <form.AppField name="description">
        {(field) => <field.TextAreaField label="Description" />}
      </form.AppField>

      <form.AppField name="jobDescription">
        {(field) => <field.TextAreaField label="Job Description" />}
      </form.AppField>
      <form.AppForm>
        <form.SubmitButton label="Save" />
      </form.AppForm>
    </form>
  );
}
