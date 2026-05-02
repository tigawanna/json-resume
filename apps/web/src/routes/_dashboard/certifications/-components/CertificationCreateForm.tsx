import { ResumePickerField } from "@/components/custom-ui/ResumePickerField";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { createCertification } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const createOpts = formOptions({
  defaultValues: { resumeId: "", name: "", issuer: "", date: "", url: "" },
});

interface CertificationCreateFormProps {
  onSuccess?: () => void;
}

export function CertificationCreateForm({ onSuccess }: CertificationCreateFormProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (values: typeof createOpts.defaultValues) =>
      createCertification({
        data: {
          resumeId: values.resumeId,
          name: values.name,
          issuer: values.issuer,
          date: values.date,
          url: values.url,
          sortOrder: 0,
        },
      }),
    onSuccess() {
      toast.success("Certification created");
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.certifications] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to create certification", {
        description: unwrapUnknownError(err).message,
      });
    },
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
      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Name is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>
      <form.AppField name="issuer">
        {(field) => (
          <div>
            <Label className="text-xs">Issuer</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField name="date">
          {(field) => (
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField name="url">
          {(field) => (
            <div>
              <Label className="text-xs">URL</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
      </div>
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(values.resumeId && values.name.trim());
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
