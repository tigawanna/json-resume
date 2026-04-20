import { Button } from "@/components/ui/button";
import { ResumePickerField } from "@/components/custom-ui/ResumePickerField";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { createTalk } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const createOpts = formOptions({
  defaultValues: { resumeId: "", title: "", event: "", date: "", description: "" },
});

interface TalkCreateFormProps {
  onSuccess?: () => void;
}

export function TalkCreateForm({ onSuccess }: TalkCreateFormProps) {
  const mutation = useMutation({
    mutationFn: async (values: typeof createOpts.defaultValues) =>
      createTalk({
        data: {
          resumeId: values.resumeId,
          title: values.title,
          event: values.event,
          date: values.date,
          description: values.description,
          sortOrder: 0,
        },
      }),
    onSuccess() {
      toast.success("Talk created");
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to create talk", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [[queryKeyPrefixes.talks], [queryKeyPrefixes.resumes]] },
  });

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <form.AppField
        name="resumeId"
        validators={{ onChange: ({ value }) => (!value ? "Resume is required" : undefined) }}
      >
        {(field) => (
          <ResumePickerField
            value={field.state.value}
            onChange={field.handleChange}
            error={field.state.meta.errors?.[0]?.toString()}
          />
        )}
      </form.AppField>
      <form.AppField
        name="title"
        validators={{ onChange: ({ value }) => (!value?.trim() ? "Title is required" : undefined) }}
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
          Reset
        </Button>
        <Button type="submit" disabled={mutation.isPending || !form.state.isFormValid}>
          {mutation.isPending ? "Creating…" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
