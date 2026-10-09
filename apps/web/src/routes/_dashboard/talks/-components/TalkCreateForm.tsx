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
import { serializeTalkLinks, talkLinksSearchable } from "../-utils/talk-links";
import { TalkLinksFields } from "./TalkLinksFields";

const createOpts = formOptions({
  defaultValues: {
    title: "",
    event: "",
    date: "",
    description: "",
    links: [] as Array<{ label: string; url: string }>,
  },
});

interface TalkCreateFormProps {
  onSuccess?: () => void;
}

export function TalkCreateForm({ onSuccess }: TalkCreateFormProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        const existing = findExistingByExactTitle(
          db.collections.resumeTalk,
          value.title,
          (row) => row.title,
        );
        if (existing) {
          toast.success("Talk already in library");
          onSuccess?.();
          return;
        }
        const base = libraryRowBase(viewer.user?.id);
        const linksJson = serializeTalkLinks(value.links);
        const searchableText = joinSearchable(
          value.title,
          value.event,
          value.date,
          value.description,
          talkLinksSearchable(value.links),
        );
        db.collections.resumeTalk.insert({
          ...base,
          title: value.title,
          event: value.event,
          date: value.date,
          description: value.description,
          links: linksJson,
          searchableText,
        });
        toast.success("Talk created");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to create talk", {
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
        name="title"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Title is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField name="event">
          {(field) => (
            <div>
              <Label className="text-xs">Event</Label>
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
      <form.AppField name="links">
        {(field) => (
          <TalkLinksFields
            links={field.state.value}
            onChange={field.handleChange}
            disabled={pending}
          />
        )}
      </form.AppField>
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(values.title.trim());
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

interface TalkCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function TalkCreateFormDialog({ open, setOpen }: TalkCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Talk</DialogTitle>
          <DialogDescription>
            Add a talk to your library so any résumé can reuse it.
          </DialogDescription>
        </DialogHeader>
        <TalkCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
