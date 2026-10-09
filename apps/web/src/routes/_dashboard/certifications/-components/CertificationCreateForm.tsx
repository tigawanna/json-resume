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
  defaultValues: { name: "", issuer: "", date: "", url: "" },
});

interface CertificationCreateFormProps {
  onSuccess?: () => void;
}

export function CertificationCreateForm({ onSuccess }: CertificationCreateFormProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        const existing = findExistingByExactTitle(
          db.collections.resumeCertification,
          value.name,
          (row) => row.name,
        );
        if (existing) {
          toast.success("Certification already in library");
          onSuccess?.();
          return;
        }
        const base = libraryRowBase(viewer.user?.id);
        const searchableText = joinSearchable(value.name, value.issuer, value.date, value.url);
        db.collections.resumeCertification.insert({
          ...base,
          name: value.name,
          issuer: value.issuer,
          date: value.date,
          url: value.url,

          searchableText,
        });
        toast.success("Certification created");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to create certification", {
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
      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>
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
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(values.name.trim());
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

interface CertificationCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function CertificationCreateFormDialog({
  open,
  setOpen,
}: CertificationCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Certification</DialogTitle>
          <DialogDescription>
            Add a certification to your library so any résumé can reuse it.
          </DialogDescription>
        </DialogHeader>
        <CertificationCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
