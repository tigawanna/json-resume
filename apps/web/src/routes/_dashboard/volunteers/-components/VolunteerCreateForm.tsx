import { ResumePickerField } from "@/components/custom-ui/ResumePickerField";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { createVolunteer } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const createOpts = formOptions({
  defaultValues: {
    resumeId: "",
    organization: "",
    role: "",
    startDate: "",
    endDate: "",
    description: "",
  },
});

interface VolunteerCreateFormProps {
  onSuccess?: () => void;
}

export function VolunteerCreateForm({ onSuccess }: VolunteerCreateFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: typeof createOpts.defaultValues) =>
      createVolunteer({
        data: {
          resumeId: values.resumeId,
          organization: values.organization,
          role: values.role,
          startDate: values.startDate,
          endDate: values.endDate,
          description: values.description,
          sortOrder: 0,
        },
      }),
    onSuccess() {
      toast.success("Volunteer entry created");
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to create volunteer entry", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [[queryKeyPrefixes.volunteers], [queryKeyPrefixes.resumes]] },
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
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField
          name="organization"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "Organization is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">Organization</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField name="role">
          {(field) => (
            <div>
              <Label className="text-xs">Role</Label>
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
          Reset
        </Button>
        <Button type="submit" disabled={mutation.isPending || !form.state.isFormValid}>
          {mutation.isPending ? "Creating…" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
