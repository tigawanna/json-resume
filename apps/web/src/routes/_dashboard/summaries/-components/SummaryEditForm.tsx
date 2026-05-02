import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { editSummaryItem } from "@/data-access-layer/resume/resume.functions";
import type { SummaryListItemDTO } from "@/data-access-layer/resume/summaries/summary.types";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const summaryEditOpts = formOptions({
  defaultValues: { text: "" },
});

interface SummaryEditFormProps {
  summary: SummaryListItemDTO;
  onSuccess?: () => void;
}

export function SummaryEditForm({ summary, onSuccess }: SummaryEditFormProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: typeof summaryEditOpts.defaultValues) =>
      editSummaryItem({ data: { id: summary.id, ...values } }),
    onSuccess() {
      toast.success("Summary saved");
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.summaries] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to save summary", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const form = useAppForm({
    ...summaryEditOpts,
    defaultValues: { text: summary.text },
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
        name="text"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Summary text is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Summary</Label>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1 min-h-30"
              rows={5}
            />
          </div>
        )}
      </form.AppField>
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(values.text.trim());
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
