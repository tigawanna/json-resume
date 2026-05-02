import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExperienceListItemDTO } from "@/data-access-layer/resume/experiences/experience.types";
import { editExperience } from "@/data-access-layer/resume/resume.functions";

import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const experienceEditOpts = formOptions({
  defaultValues: {
    role: "",
    company: "",
    startDate: "",
    endDate: "",
    location: "",
    sortOrder: 0,
  },
});

interface ExperienceEditFormProps {
  experience: ExperienceListItemDTO;
  onSuccess?: () => void;
}

export function ExperienceEditForm({ experience, onSuccess }: ExperienceEditFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: typeof experienceEditOpts.defaultValues) =>
      editExperience({
        data: { id: experience.id, ...values },
      }),
    onSuccess() {
      toast.success("Experience saved");
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to save experience", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [[queryKeyPrefixes.experiences], [queryKeyPrefixes.resumes]] },
  });

  const form = useAppForm({
    ...experienceEditOpts,
    defaultValues: {
      role: experience.role,
      company: experience.company,
      startDate: experience.startDate,
      endDate: experience.endDate,
      location: experience.location,
      sortOrder: experience.sortOrder,
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

        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField
          name="role"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "Job title is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">Job Title</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>

        <form.AppField
          name="company"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "Company is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">Company</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
      </div>

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

      <form.AppField name="location">
        {(field) => (
          <div>
            <Label className="text-xs">Location</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>

      <form.AppField
        name="sortOrder"
        validators={{
          onChange: ({ value }) =>
            !Number.isInteger(value) || value < 0 ? "Must be a non-negative integer" : undefined,
        }}
      >
        {(field) => (
          <div className="w-32">
            <Label className="text-xs">Display Order</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value))}
              className="mt-1"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Higher numbers appear first on the resume
            </p>
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
