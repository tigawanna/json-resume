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
import { Textarea } from "@/components/ui/textarea";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import type { EducationListItemDTO } from "@/data-access-layer/resume/education/education.types";
import { editEducation } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

const DEGREE_OPTIONS = ["Degree", "Diploma", "Certificate"];

const educationEditOpts = formOptions({
  defaultValues: {
    school: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
    description: "",
  },
});

interface EducationEditFormProps {
  education: EducationListItemDTO;
  onSuccess?: () => void;
}

export function EducationEditForm({ education, onSuccess }: EducationEditFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: typeof educationEditOpts.defaultValues) =>
      editEducation({
        data: { id: education.id, ...values },
      }),
    onSuccess() {
      toast.success("Education saved");
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to save education", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [[queryKeyPrefixes.education], [queryKeyPrefixes.resumes]],
    },
  });

  const form = useAppForm({
    ...educationEditOpts,
    defaultValues: {
      school: education.school,
      degree: education.degree,
      field: education.field,
      startDate: education.startDate,
      endDate: education.endDate,
      description: education.description,
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
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField
          name="school"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "School is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">School</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>

        <form.AppField
          name="degree"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "Degree is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">Degree / Diploma / Certificate</Label>
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
                    {DEGREE_OPTIONS.map((option) => (
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
      </div>

      <form.AppField name="field">
        {(field) => (
          <div>
            <Label className="text-xs">Field of Study</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>

      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField name="startDate">
          {(field) => (
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>

        <form.AppField name="endDate">
          {(field) => (
            <div>
              <Label className="text-xs">End Date</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
      </div>

      <form.AppField name="description">
        {(field) => (
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
              rows={3}
            />
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
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending || !form.state.isFormValid}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
