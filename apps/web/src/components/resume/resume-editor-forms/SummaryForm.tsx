import { updateSummary } from "@/data-access-layer/resume/resume.functions";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveSuspenseQuery } from "@tanstack/react-db";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface SummaryFormProps {
  resumeId: string;
}

const formOpts = formOptions({
  defaultValues: { text: "" },
});

export function SummaryForm({ resumeId }: SummaryFormProps) {
  const { data: resume } = useLiveSuspenseQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );

  const mutation = useMutation({
    mutationFn: async (values: { text: string }) =>
      updateSummary({ data: { resumeId, text: values.text } }),
    onSuccess() {
      toast.success("Summary saved");
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        summaries: [{ id: "", resumeId, text: form.state.values.text, sortOrder: 0 }],
      });
    },
    onError(err: unknown) {
      toast.error("Failed to save summary", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  const form = useAppForm({
    ...formOpts,
    defaultValues: {
      text: resume?.summaries[0]?.text ?? "",
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
        form.handleSubmit();
      }}
      className="flex flex-col gap-4"
      data-test="summary-form">
      <form.AppField name="text">
        {(field) => <field.TextAreaField label="Professional Summary" />}
      </form.AppField>

      <form.AppForm>
        <form.SubmitButton label="Save Summary" />
      </form.AppForm>
    </form>
  );
}
