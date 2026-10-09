import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { TEMPLATE_IDS } from "@/features/resume/resume-schema";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

const formOpts = formOptions({
  defaultValues: {
    name: "",
    fullName: "",
    headline: "",
    description: "",
    templateId: "classic",
  },
});

/** Résumé-level details: internal name, the name and headline it prints, and private notes. */
export function MetadataForm() {
  const { resume, updateMetadata } = useResumeWorkspace();

  const mutation = useMutation({
    mutationFn: async (values: typeof formOpts.defaultValues) =>
      updateMetadata({
        ...values,
        templateId: z.enum(TEMPLATE_IDS).parse(values.templateId),
      }),
    onSuccess() {
      toast.success("Details saved");
    },
    onError(err: unknown) {
      toast.error("Failed to save details", {
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
        {(field) => (
          <field.TextField
            label="Resume Name"
            description="Only you see this — e.g. “Frontend 2026”."
          />
        )}
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
        {(field) => (
          <field.TextAreaField
            label="Description"
            placeholder="Private notes about this version."
          />
        )}
      </form.AppField>

      <div className="flex justify-end">
        <form.AppForm>
          <form.SubmitButton label="Save details" />
        </form.AppForm>
      </div>
    </form>
  );
}
