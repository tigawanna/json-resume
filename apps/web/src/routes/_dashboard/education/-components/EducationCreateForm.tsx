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
  defaultValues: { school: "", degree: "", field: "", startDate: "", endDate: "", description: "" },
});

interface EducationCreateFormProps {
  onSuccess?: () => void;
}

export function EducationCreateForm({ onSuccess }: EducationCreateFormProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        const existing = findExistingByExactTitle(
          db.collections.resumeEducation,
          `${value.school} ${value.degree}`,
          (row) => `${row.school} ${row.degree}`,
        );
        if (existing) {
          toast.success("Education already in library");
          onSuccess?.();
          return;
        }
        const base = libraryRowBase(viewer.user?.id);
        const searchableText = joinSearchable(
          value.school,
          value.degree,
          value.field,
          value.startDate,
          value.endDate,
          value.description,
        );
        db.collections.resumeEducation.insert({
          ...base,
          school: value.school,
          degree: value.degree,
          field: value.field,
          startDate: value.startDate,
          endDate: value.endDate,
          description: value.description,

          searchableText,
        });
        toast.success("Education created");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to create education", {
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
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField
          name="school"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "School is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">School</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField
          name="degree"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "Qualification is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">Qualification</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
      </div>
      <form.AppField name="field">
        {(field) => (
          <div>
            <Label className="text-xs">Field of Study</Label>
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
              <Label className="text-xs">Start</Label>
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
              <Label className="text-xs">End</Label>
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
              className="mt-1 min-h-24"
            />
          </div>
        )}
      </form.AppField>
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(values.school.trim()) && Boolean(values.degree.trim());
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

interface EducationCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function EducationCreateFormDialog({ open, setOpen }: EducationCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Education</DialogTitle>
          <DialogDescription>
            Add an education entry to your library so any résumé can reuse it.
          </DialogDescription>
        </DialogHeader>
        <EducationCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
