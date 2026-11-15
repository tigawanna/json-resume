import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { TEMPLATE_IDS } from "@/features/resume/resume-schema";
import { useAppForm } from "@/lib/tanstack/form";
import { formOptions } from "@tanstack/react-form";
import { z } from "zod";
import { DraftAutosave } from "./use-resume-autosave";

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
  const saved = {
    name: resume?.name ?? "",
    fullName: resume?.fullName ?? "",
    headline: resume?.headline ?? "",
    description: resume?.description ?? "",
    templateId: resume?.templateId ?? "classic",
  };

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

      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <DraftAutosave
            value={values}
            saved={saved}
            canSave={values.name.trim().length > 0}
            blocked="Name is required"
            save={(next) =>
              updateMetadata({
                ...next,
                templateId: z.enum(TEMPLATE_IDS).parse(next.templateId),
              })
            }
          />
        )}
      </form.Subscribe>
    </form>
  );
}
