import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import { useState, useRef } from "react";
import { toast } from "sonner";
import { findExistingByExactTitle } from "../../-utils/find-existing";
import { joinSearchable, libraryRowBase } from "../../-utils/row-helpers";

const createOpts = formOptions({
  defaultValues: { type: "", label: "", value: "" },
});

interface ContactCreateFormProps {
  onSuccess?: () => void;
}

export function ContactCreateForm({ onSuccess }: ContactCreateFormProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLFormElement>(null);

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        const existing = findExistingByExactTitle(
          db.collections.resumeContact,
          `${value.type} ${value.value}`,
          (row) => `${row.type} ${row.value}`,
        );
        if (existing) {
          toast.success("Contact already in library");
          onSuccess?.();
          return;
        }
        const base = libraryRowBase(viewer.user?.id);
        const searchableText = joinSearchable(value.type, value.value, value.label);
        db.collections.resumeContact.insert({
          ...base,
          type: value.type,
          label: value.label,
          value: value.value,

          searchableText,
        });
        toast.success("Contact created");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to create contact", {
          description: unwrapUnknownError(err).message,
        });
      } finally {
        setPending(false);
      }
    },
  });

  return (
    <form
      ref={containerRef}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField
          name="type"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "Type is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">Type</Label>
              <Combobox
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value ?? "")}
              >
                <ComboboxInput
                  placeholder="Select or type…"
                  showTrigger
                  showClear
                  disabled={false}
                />
                <ComboboxContent container={containerRef}>
                  <ComboboxList>
                    {["email", "phone", "location", "address", "website"].map((option) => (
                      <ComboboxItem key={option} value={option}>
                        {option}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          )}
        </form.AppField>
        <form.AppField name="label">
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
      </div>
      <form.AppField
        name="value"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Value is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Value</Label>
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
          const hasRequired = Boolean(values.type.trim()) && Boolean(values.value.trim());
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

interface ContactCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ContactCreateFormDialog({ open, setOpen }: ContactCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Contact</DialogTitle>
          <DialogDescription>
            Add a contact to your library so any résumé can reuse it.
          </DialogDescription>
        </DialogHeader>
        <ContactCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
