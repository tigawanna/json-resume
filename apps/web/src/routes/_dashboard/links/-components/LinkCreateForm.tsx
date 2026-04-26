import { ResumePickerField } from "@/components/custom-ui/ResumePickerField";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { createLink } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const createOpts = formOptions({
  defaultValues: { resumeId: "", label: "", url: "", icon: "" },
});

interface LinkCreateFormProps {
  onSuccess?: () => void;
}

export function LinkCreateForm({ onSuccess }: LinkCreateFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: typeof createOpts.defaultValues) =>
      createLink({
        data: {
          resumeId: values.resumeId,
          label: values.label,
          url: values.url,
          icon: values.icon || undefined,
          sortOrder: 0,
        },
      }),
    onSuccess() {
      toast.success("Link created");
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to create link", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [[queryKeyPrefixes.links], [queryKeyPrefixes.resumes]] },
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
        name="label"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Label is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>
      <form.AppField
        name="url"
        validators={{ onChange: ({ value }) => (!value?.trim() ? "URL is required" : undefined) }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">URL</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
              type="url"
            />
          </div>
        )}
      </form.AppField>
      <form.AppField name="icon">
        {(field) => (
          <div>
            <Label className="text-xs">Icon</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
              placeholder="e.g. github, linkedin, globe"
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
