import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { joinSearchable, libraryRowBase } from "../../-utils/row-helpers";
import { emptyResumeLayout } from "@/features/resume/resume-layout";

const createOpts = formOptions({
  defaultValues: {
    name: "",
    fullName: "",
    headline: "",
    description: "",
    jobDescription: "",
    templateId: "default",
  },
});

interface ResumeCreateFormProps {
  onSuccess?: () => void;
}

export function ResumeCreateForm({ onSuccess }: ResumeCreateFormProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      const userId = viewer.user?.id;
      if (!userId) {
        toast.error("You must be signed in to create a résumé");
        return;
      }

      setPending(true);
      try {
        const base = libraryRowBase(userId);
        db.collections.resume.insert({
          id: base.id,
          userId,
          name: value.name,
          fullName: value.fullName || value.name,
          headline: value.headline,
          description: value.description,
          jobDescription: value.jobDescription,
          jobId: null,
          templateId: value.templateId || "default",
          layout: emptyResumeLayout(),
          searchableText: joinSearchable(
            value.name,
            value.fullName,
            value.headline,
            value.description,
          ),
          embedding: null,
          embeddingModel: null,
          createdAt: base.createdAt,
          updatedAt: base.updatedAt,
        });
        toast.success("Résumé created");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to create résumé", {
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
            <Label className="text-xs">Display Name</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
              placeholder="e.g. Backend Engineer — Acme"
            />
          </div>
        )}
      </form.AppField>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField name="fullName">
          {(field) => (
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField name="headline">
          {(field) => (
            <div>
              <Label className="text-xs">Headline</Label>
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
              className="mt-1 min-h-20"
            />
          </div>
        )}
      </form.AppField>
      <form.Subscribe selector={(s) => s.values}>
        {(values) => (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={pending}>
              Reset
            </Button>
            <Button
              type="submit"
              disabled={pending || !values.name.trim() || !form.state.isFormValid}
            >
              {pending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        )}
      </form.Subscribe>
    </form>
  );
}

interface ResumeCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ResumeCreateFormDialog({ open, setOpen }: ResumeCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Résumé</DialogTitle>
        </DialogHeader>
        <ResumeCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
