import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { certificationsCollection } from "@/data-access-layer/resume/certifications/certification.collection";
import type { CertificationListItemDTO } from "@/data-access-layer/resume/certifications/certification.types";
import { editCertification } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const certificationEditOpts = formOptions({
  defaultValues: { name: "", issuer: "", date: "", url: "" },
});

interface CertificationEditFormProps {
  certification: CertificationListItemDTO;
  onSuccess?: () => void;
}

export function CertificationEditForm({ certification, onSuccess }: CertificationEditFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: typeof certificationEditOpts.defaultValues) =>
      editCertification({ data: { id: certification.id, ...values } }),
    onSuccess(data, values) {
      toast.success("Certification saved");
      certificationsCollection.utils.writeUpdate({ ...certification, ...values });
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to save certification", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [[queryKeyPrefixes.certifications], [queryKeyPrefixes.resumes]] },
  });

  const form = useAppForm({
    ...certificationEditOpts,
    defaultValues: {
      name: certification.name,
      issuer: certification.issuer,
      date: certification.date,
      url: certification.url,
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
        name="name"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Name is required" : undefined),
        }}>
        {(field) => (
          <div>
            <Label className="text-xs">Certification Name</Label>
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
