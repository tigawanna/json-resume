import { ResumePickerField } from "@/components/custom-ui/ResumePickerField";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { createLanguage } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const PROFICIENCY_OPTIONS = ["Native", "Fluent", "Professional", "Conversational", "Basic"];

const createOpts = formOptions({
  defaultValues: { resumeId: "", name: "", proficiency: "" },
});

interface LanguageCreateFormProps {
  onSuccess?: () => void;
}

export function LanguageCreateForm({ onSuccess }: LanguageCreateFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: typeof createOpts.defaultValues) =>
      createLanguage({
        data: {
          resumeId: values.resumeId,
          name: values.name,
          proficiency: values.proficiency,
          sortOrder: 0,
        },
      }),
    onSuccess() {
      toast.success("Language created");
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to create language", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [[queryKeyPrefixes.languages], [queryKeyPrefixes.resumes]] },
  });

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();

        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <form.AppField
        name="resumeId"
        validators={{ onChange: ({ value }) => (!value ? "Resume is required" : undefined) }}
      >
        {(field) => (
          <ResumePickerField
            value={field.state.value}
            onChange={field.handleChange}
            error={field.state.meta.errors?.[0]?.toString()}
          />
        )}
      </form.AppField>
      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Language name is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Language</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>
      <form.AppField name="proficiency">
        {(field) => (
          <div>
            <Label className="text-xs">Proficiency</Label>
            <Combobox
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value ?? "")}
            >
              <ComboboxInput
                placeholder="Select or type..."
                showTrigger
                showClear
                disabled={false}
              />
              <ComboboxContent>
                <ComboboxList>
                  {PROFICIENCY_OPTIONS.map((option) => (
                    <ComboboxItem key={option} value={option}>
                      {option}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        )}
      </form.AppField>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
          disabled={mutation.isPending}
        >
          Reset
        </Button>
        <Button type="submit" disabled={mutation.isPending || !form.state.isFormValid}>
          {mutation.isPending ? "Creating…" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
