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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { insertJob, JOB_STATUS_OPTIONS } from "@/data-access-layer/event-sourced/job-rows";
import type { JobStatus } from "@/data-access-layer/event-sourced/schemas";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";

const createOpts = formOptions({
  defaultValues: {
    company: "",
    title: "",
    description: "",
    location: "",
    url: "",
    status: "saved" as JobStatus,
    notes: "",
  },
});

interface JobCreateFormProps {
  onSuccess?: () => void;
}

export function JobCreateForm({ onSuccess }: JobCreateFormProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        insertJob(db, viewer.user?.id, {
          company: value.company,
          title: value.title,
          description: value.description,
          location: value.location,
          url: value.url,
          status: value.status,
          notes: value.notes,
        });
        toast.success("Job saved");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to save job", {
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
        <form.AppField name="company">
          {(field) => (
            <div>
              <Label className="text-xs">Company</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
                placeholder="Optional"
                data-test="job-company"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField name="title">
          {(field) => (
            <div>
              <Label className="text-xs">Role title</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
                placeholder="Optional"
              />
            </div>
          )}
        </form.AppField>
      </div>
      <form.AppField
        name="description"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Job description is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Job description</Label>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1 min-h-32"
              placeholder="Paste the posting. Only this field is required."
              data-test="job-description"
            />
          </div>
        )}
      </form.AppField>
      <div className="grid gap-3 sm:grid-cols-2">
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
        <form.AppField name="url">
          {(field) => (
            <div>
              <Label className="text-xs">Posting URL</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
      </div>
      <form.AppField name="status">
        {(field) => (
          <div>
            <Label className="text-xs">Status</Label>
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value as JobStatus)}
            >
              <SelectTrigger className="mt-1 w-full" data-test="job-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </form.AppField>
      <form.AppField name="notes">
        {(field) => (
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1 min-h-16"
            />
          </div>
        )}
      </form.AppField>
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(values.description.trim());
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
                {pending ? "Saving…" : "Save job"}
              </Button>
            </DialogFooter>
          );
        }}
      </form.Subscribe>
    </form>
  );
}

interface JobCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function JobCreateFormDialog({ open, setOpen }: JobCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New job</DialogTitle>
          <DialogDescription>
            Save a job posting so you can tailor résumés against it.
          </DialogDescription>
        </DialogHeader>
        <JobCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
