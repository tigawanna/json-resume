import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const formOpts = formOptions({
  defaultValues: { label: "Notes", text: "" },
});

export function NotesForm() {
  const { resume, updateNotes } = useResumeWorkspace();

  const mutation = useMutation({
    mutationFn: async (values: { label: string; text: string }) => updateNotes(values),
    onSuccess() {
      toast.success("Notes saved");
    },
    onError(err: unknown) {
      toast.error("Failed to save notes", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  const form = useAppForm({
    ...formOpts,
    defaultValues: {
      label: resume?.notes[0]?.label || "Notes",
      text: resume?.notes[0]?.text ?? "",
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
      data-test="notes-form"
    >
      <p className="text-muted-foreground text-sm">
        Printed full-width at the bottom of the résumé. Use a heading like “Cover letter” for a
        condensed note that does not belong in the summary.
      </p>
      <form.AppField name="label">{(field) => <field.TextField label="Heading" />}</form.AppField>
      <form.AppField name="text">{(field) => <field.TextAreaField label="Body" />}</form.AppField>

      <form.AppForm>
        <form.SubmitButton label="Save Notes" />
      </form.AppForm>
    </form>
  );
}
