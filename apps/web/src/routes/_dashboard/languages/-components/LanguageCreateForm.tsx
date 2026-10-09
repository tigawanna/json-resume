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
  defaultValues: { name: "", proficiency: "" },
});

interface LanguageCreateFormProps {
  onSuccess?: () => void;
}

export function LanguageCreateForm({ onSuccess }: LanguageCreateFormProps) {
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
          db.collections.resumeLanguage,
          value.name,
          (row) => row.name,
        );
        if (existing) {
          toast.success("Language already in library");
          onSuccess?.();
          return;
        }
        const base = libraryRowBase(viewer.user?.id);
        const searchableText = joinSearchable(value.name, value.proficiency);
        db.collections.resumeLanguage.insert({
          ...base,
          name: value.name,
          proficiency: value.proficiency,

          searchableText,
        });
        toast.success("Language created");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to create language", {
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
      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Language is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Language</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>
      <form.AppField name="proficiency">
        {(field) => (
          <div>
            <Label className="text-xs">Proficiency</Label>
            <Combobox
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value ?? "")}
            >
              <ComboboxInput placeholder="Select or type…" showTrigger showClear disabled={false} />
              <ComboboxContent container={containerRef}>
                <ComboboxList>
                  {["Native", "Fluent", "Professional", "Conversational", "Basic"].map((option) => (
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

interface LanguageCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function LanguageCreateFormDialog({ open, setOpen }: LanguageCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Language</DialogTitle>
          <DialogDescription>
            Add a language to your library so any résumé can reuse it.
          </DialogDescription>
        </DialogHeader>
        <LanguageCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
