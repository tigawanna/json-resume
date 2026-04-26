import { updateResumeMeta } from "@/data-access-layer/resume/resume.functions";
import {
  resumeCollection,
  resumesCollection,
} from "@/data-access-layer/resume/resumes-query-collection";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveSuspenseQuery } from "@tanstack/react-db";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

interface MetadataFormProps {
  resumeId: string;
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

export function MetadataForm({ resumeId }: MetadataFormProps) {
  const { data: resume } = useLiveSuspenseQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );

  const mutation = useMutation({
    mutationFn: async (values: typeof formOpts.defaultValues) =>
      updateResumeMeta({ data: { id: resumeId, ...values } }),
    async onSuccess() {
      toast.success("Resume updated");
      const updates = {
        id: resumeId,
        name: form.state.values.name,
        fullName: form.state.values.fullName,
        headline: form.state.values.headline,
        description: form.state.values.description,
        jobDescription: form.state.values.jobDescription,
        templateId: form.state.values.templateId,
      };
      resumeCollection.utils.writeUpdate(updates);
      resumesCollection.utils.writeUpdate({
        id: resumeId,
        name: updates.name,
        fullName: updates.fullName,
        headline: updates.headline,
        description: updates.description,
        templateId: updates.templateId,
        updatedAt: new Date().toISOString(),
      });
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
      name: resume?.name ?? "",
      fullName: resume?.fullName ?? "",
      headline: resume?.headline ?? "",
      description: resume?.description ?? "",
      jobDescription: resume?.jobDescription ?? "",
      templateId: resume?.templateId ?? "classic",
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  if (!resume) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();

        void form.handleSubmit();
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
