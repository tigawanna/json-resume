import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { createSummaryItem } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const createOpts = formOptions({
  defaultValues: { resumeId: "", text: "" },
});

interface SummaryCreateFormProps {
  onSuccess?: () => void;
}

export function SummaryCreateForm({ onSuccess }: SummaryCreateFormProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (values: typeof createOpts.defaultValues) =>
      createSummaryItem({
        data: { resumeId: values.resumeId, text: values.text, sortOrder: 0 },
      }),
    onSuccess() {
      toast.success("Summary created");
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.summaries] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to create summary", { description: unwrapUnknownError(err).message });
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

interface SummaryCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
export function SummaryCreateFormDialog({ open, setOpen }: SummaryCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Summary</DialogTitle>
        </DialogHeader>
        <SummaryCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
