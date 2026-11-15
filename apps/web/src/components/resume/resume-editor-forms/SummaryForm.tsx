import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { useAppForm } from "@/lib/tanstack/form";
import { formOptions } from "@tanstack/react-form";
import { DraftAutosave } from "./use-resume-autosave";

const formOpts = formOptions({
  defaultValues: { text: "" },
});

export function SummaryForm() {
  const { resume, updateSummary } = useResumeWorkspace();
  const saved = { text: resume?.summaries[0]?.text ?? "" };

  const form = useAppForm({
    ...formOpts,
    defaultValues: saved,
  });

  if (!resume) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="flex flex-col gap-4"
      data-test="summary-form"
    >
      <form.AppField name="text">
        {(field) => <field.TextAreaField label="Professional Summary" />}
      </form.AppField>

      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <DraftAutosave
            value={values}
            saved={saved}
            canSave
            save={(next) => updateSummary(next.text)}
          />
        )}
      </form.Subscribe>
    </form>
  );
}
