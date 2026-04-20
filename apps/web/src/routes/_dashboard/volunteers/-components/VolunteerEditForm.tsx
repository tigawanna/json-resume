import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { editVolunteer } from "@/data-access-layer/resume/resume.functions";
import { volunteersCollection } from "@/data-access-layer/resume/volunteers/volunteer.collection";
import type { VolunteerListItemDTO } from "@/data-access-layer/resume/volunteers/volunteer.types";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const volunteerEditOpts = formOptions({
  defaultValues: { organization: "", role: "", startDate: "", endDate: "", description: "" },
});

interface VolunteerEditFormProps {
  volunteer: VolunteerListItemDTO;
  onSuccess?: () => void;
}

export function VolunteerEditForm({ volunteer, onSuccess }: VolunteerEditFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: typeof volunteerEditOpts.defaultValues) =>
      editVolunteer({ data: { id: volunteer.id, ...values } }),
    onSuccess(data, values) {
      toast.success("Volunteer entry saved");
      volunteersCollection.utils.writeUpdate({ ...volunteer, ...values });
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to save volunteer entry", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [[queryKeyPrefixes.volunteers], [queryKeyPrefixes.resumes]] },
  });

  const form = useAppForm({
    ...volunteerEditOpts,
    defaultValues: {
      organization: volunteer.organization,
      role: volunteer.role,
      startDate: volunteer.startDate,
      endDate: volunteer.endDate,
      description: volunteer.description,
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
      className="flex flex-col gap-3">
      <form.AppField
        name="organization"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Organization is required" : undefined),
        }}>
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
          disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending || !form.state.isFormValid}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
