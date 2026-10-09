import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { findExistingByExactTitle } from "../../-utils/find-existing";
import { joinSearchable, libraryRowBase } from "../../-utils/row-helpers";

const createOpts = formOptions({
  defaultValues: { text: "" },
});

interface SummaryCreateFormProps {
  onSuccess?: () => void;
}

export function SummaryCreateForm({ onSuccess }: SummaryCreateFormProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        const existing = findExistingByExactTitle(
          db.collections.resumeSummary,
          value.text,
          (row) => row.text,
        );
        if (existing) {
          toast.success("Summary already in library");
          onSuccess?.();
          return;
        }
        const base = libraryRowBase(viewer.user?.id);
        const searchableText = joinSearchable(value.text);
        db.collections.resumeSummary.insert({
          ...base,
          text: value.text,

          searchableText,
        });
        toast.success("Summary created");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to create summary", {
          description: unwrapUnknownError(err).message,
        });
      } finally {
        setPending(false);
      }
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
          onChange: ({ value }) => (!value?.trim() ? "Summary is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Summary</Label>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1 min-h-24"
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
                disabled={pending}
              >
                Reset
              </Button>
              <Button type="submit" disabled={pending || !hasRequired || !form.state.isFormValid}>
                {pending ? "Creating…" : "Create"}
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
          <DialogDescription>
            Add a summary to your library so any résumé can reuse it.
          </DialogDescription>
        </DialogHeader>
        <SummaryCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
