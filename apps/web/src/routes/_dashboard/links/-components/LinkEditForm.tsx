import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import type { LinkListItemDTO } from "@/data-access-layer/resume/links/link.types";
import { editLink } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const linkEditOpts = formOptions({
  defaultValues: { label: "", url: "", icon: "" },
});

interface LinkEditFormProps {
  link: LinkListItemDTO;
  onSuccess?: () => void;
}

export function LinkEditForm({ link, onSuccess }: LinkEditFormProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: typeof linkEditOpts.defaultValues) =>
      editLink({ data: { id: link.id, ...values } }),
    onSuccess() {
      toast.success("Link saved");
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.links] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to save link", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const form = useAppForm({
    ...linkEditOpts,
    defaultValues: {
      label: link.label,
      url: link.url,
      icon: link.icon ?? "",
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
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "URL is required" : undefined),
        }}
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
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(values.label.trim() && values.url.trim());
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
