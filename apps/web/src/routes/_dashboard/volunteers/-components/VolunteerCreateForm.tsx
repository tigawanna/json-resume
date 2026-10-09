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
  defaultValues: { organization: "", role: "", startDate: "", endDate: "", description: "" },
});

interface VolunteerCreateFormProps {
  onSuccess?: () => void;
}

export function VolunteerCreateForm({ onSuccess }: VolunteerCreateFormProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        const existing = findExistingByExactTitle(
          db.collections.resumeVolunteer,
          `${value.organization} ${value.role}`,
          (row) => `${row.organization} ${row.role}`,
        );
        if (existing) {
          toast.success("Volunteer already in library");
          onSuccess?.();
          return;
        }
        const base = libraryRowBase(viewer.user?.id);
        const searchableText = joinSearchable(
          value.organization,
          value.role,
          value.startDate,
          value.endDate,
          value.description,
        );
        db.collections.resumeVolunteer.insert({
          ...base,
          organization: value.organization,
          role: value.role,
          startDate: value.startDate,
          endDate: value.endDate,
          description: value.description,

          searchableText,
        });
        toast.success("Volunteer created");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to create volunteer", {
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
          name="organization"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "Organization is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">Organization</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField name="role">
          {(field) => (
            <div>
              <Label className="text-xs">Role</Label>
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
          const hasRequired = Boolean(values.organization.trim());
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

interface VolunteerCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function VolunteerCreateFormDialog({ open, setOpen }: VolunteerCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Volunteer</DialogTitle>
          <DialogDescription>
            Add a volunteer entry to your library so any résumé can reuse it.
          </DialogDescription>
        </DialogHeader>
        <VolunteerCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
