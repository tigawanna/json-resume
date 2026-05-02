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
import type { LanguageListItemDTO } from "@/data-access-layer/resume/languages/language.types";
import { editLanguage } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

const PROFICIENCY_OPTIONS = ["Native", "Fluent", "Professional", "Conversational", "Basic"];

const languageEditOpts = formOptions({
  defaultValues: { name: "", proficiency: "" },
});

interface LanguageEditFormProps {
  language: LanguageListItemDTO;
  onSuccess?: () => void;
}

export function LanguageEditForm({ language, onSuccess }: LanguageEditFormProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: typeof languageEditOpts.defaultValues) =>
      editLanguage({ data: { id: language.id, ...values } }),
    onSuccess() {
      toast.success("Language saved");
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.languages] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to save language", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const form = useAppForm({
    ...languageEditOpts,
    defaultValues: {
      name: language.name,
      proficiency: language.proficiency,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  const containerRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={containerRef}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();

        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
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
              <ComboboxContent container={containerRef}>
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
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(values.name.trim());
          return (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !hasRequired || !form.state.isFormValid}
              >
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          );
        }}
      </form.Subscribe>
    </form>
  );
}
