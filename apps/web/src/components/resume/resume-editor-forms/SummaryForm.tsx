import { updateSummary } from "@/data-access-layer/resume/resume.functions";
import type { ResumeDetailDTO } from "@/data-access-layer/resume/resume.types";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface SummaryFormProps {
  resume: ResumeDetailDTO;
}

const formOpts = formOptions({
  defaultValues: { text: "" },
});

export function SummaryForm({ resume }: SummaryFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: { text: string }) =>
      updateSummary({ data: { resumeId: resume.id, text: values.text } }),
    onSuccess() {
      toast.success("Summary saved");
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
      text: resume.summaries[0]?.text ?? "",
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
      data-test="summary-form"
    >
      <form.AppField name="text">
        {(field) => <field.TextAreaField label="Professional Summary" />}
      </form.AppField>

      <form.AppForm>
        <form.SubmitButton label="Save Summary" />
      </form.AppForm>
    </form>
  );
}
