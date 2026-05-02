import { ResumePickerField } from "@/components/custom-ui/ResumePickerField";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { createExperience } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const createOpts = formOptions({
  defaultValues: {
    resumeId: "",
    role: "",
    company: "",
    startDate: "",
    endDate: "",
    location: "",
    sortOrder: 0,
  },
});

interface ExperienceCreateFormProps {
  onSuccess?: () => void;
}

export function ExperienceCreateForm({ onSuccess }: ExperienceCreateFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: typeof createOpts.defaultValues) =>
      createExperience({
        data: {
          resumeId: values.resumeId,
          company: values.company,
          role: values.role,
          startDate: values.startDate,
          endDate: values.endDate,
          location: values.location,
          sortOrder: values.sortOrder,
          bullets: [],
        },
      }),
    onSuccess() {
      toast.success("Experience created");
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to create experience", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [[queryKeyPrefixes.experiences], [queryKeyPrefixes.resumes]] },
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
        validators={{
          onChange: ({ value }) => (!value ? "Resume is required" : undefined),
        }}
      >
        {(field) => (
          <ResumePickerField
            value={field.state.value}
            onChange={field.handleChange}
            error={field.state.meta.errors?.[0]?.toString()}
          />
        )}
      </form.AppField>
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

      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(
            values.resumeId && values.role.trim() && values.company.trim(),
          );
          return (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={mutation.isPending}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !hasRequired || !form.state.isFormValid}
              >
                {mutation.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          );
        }}
      </form.Subscribe>
    </form>
  );
}
