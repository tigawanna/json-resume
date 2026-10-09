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
  defaultValues: { role: "", company: "", startDate: "", endDate: "", location: "" },
});

interface ExperienceCreateFormProps {
  onSuccess?: () => void;
}

export function ExperienceCreateForm({ onSuccess }: ExperienceCreateFormProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        const existing = findExistingByExactTitle(
          db.collections.resumeExperience,
          `${value.role} @ ${value.company}`,
          (row) => `${row.role} @ ${row.company}`,
        );
        if (existing) {
          toast.success("Experience already in library");
          onSuccess?.();
          return;
        }
        const base = libraryRowBase(viewer.user?.id);
        const searchableText = joinSearchable(
          value.role,
          value.company,
          value.location,
          value.startDate,
          value.endDate,
        );
        db.collections.resumeExperience.insert({
          ...base,
          role: value.role,
          company: value.company,
          startDate: value.startDate,
          endDate: value.endDate,
          location: value.location,

          searchableText,
        });
        toast.success("Experience created");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to create experience", {
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
          name="role"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "Job Title is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">Job Title</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField
          name="company"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "Company is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">Company</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
      </div>
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
      <form.AppField name="location">
        {(field) => (
          <div>
            <Label className="text-xs">Location</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(values.role.trim()) && Boolean(values.company.trim());
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

interface ExperienceCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ExperienceCreateFormDialog({ open, setOpen }: ExperienceCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Experience</DialogTitle>
          <DialogDescription>
            Add an experience to your library so any résumé can reuse it.
          </DialogDescription>
        </DialogHeader>
        <ExperienceCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
