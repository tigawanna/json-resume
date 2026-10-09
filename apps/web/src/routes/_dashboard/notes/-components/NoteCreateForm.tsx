import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  defaultValues: { label: "Notes", text: "" },
});

interface NoteCreateFormProps {
  onSuccess?: () => void;
}

export function NoteCreateForm({ onSuccess }: NoteCreateFormProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        const existing = findExistingByExactTitle(
          db.collections.resumeNote,
          value.text,
          (row) => row.text,
        );
        if (existing) {
          toast.success("Note already in library");
          onSuccess?.();
          return;
        }
        const base = libraryRowBase(viewer.user?.id);
        const label = value.label.trim() || "Notes";
        const searchableText = joinSearchable(label, value.text);
        db.collections.resumeNote.insert({
          ...base,
          label,
          text: value.text,
          searchableText,
        });
        toast.success("Note created");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to create note", {
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
      <form.AppField name="label">
        {(field) => (
          <div>
            <Label className="text-xs">Heading</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
              placeholder="Notes, Cover letter, …"
            />
          </div>
        )}
      </form.AppField>
      <form.AppField
        name="text"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Note text is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1 min-h-32"
              placeholder="Condensed cover letter or addendum printed at the bottom of the résumé."
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

interface NoteCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function NoteCreateFormDialog({ open, setOpen }: NoteCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Note</DialogTitle>
          <DialogDescription>Write a note to keep alongside your library.</DialogDescription>
        </DialogHeader>
        <NoteCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
