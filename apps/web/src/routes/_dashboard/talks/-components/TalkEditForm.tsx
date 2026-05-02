import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { editTalk } from "@/data-access-layer/resume/resume.functions";
// import { talksCollection } from "@/data-access-layer/resume/talks/talk.collection";
import type { TalkListItemDTO } from "@/data-access-layer/resume/talks/talk.types";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const talkEditOpts = formOptions({
  defaultValues: { title: "", event: "", date: "", description: "" },
});

interface TalkEditFormProps {
  talk: TalkListItemDTO;
  onSuccess?: () => void;
}

export function TalkEditForm({ talk, onSuccess }: TalkEditFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: typeof talkEditOpts.defaultValues) =>
      editTalk({ data: { id: talk.id, ...values } }),
    onSuccess() {
      toast.success("Talk saved");
      // talksCollection.utils.writeUpdate({ ...talk, ...values });
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to save talk", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [[queryKeyPrefixes.talks], [queryKeyPrefixes.resumes]] },
  });

  const form = useAppForm({
    ...talkEditOpts,
    defaultValues: {
      title: talk.title,
      event: talk.event,
      date: talk.date,
      description: talk.description,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
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
              className="mt-1"
              rows={3}
            />
          </div>
        )}
      </form.AppField>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending || !form.state.isFormValid}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
