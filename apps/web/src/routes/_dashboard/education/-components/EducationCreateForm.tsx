import { ResumePickerField } from "@/components/custom-ui/ResumePickerField";
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
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { createEducation } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const createOpts = formOptions({
  defaultValues: {
    resumeId: "",
    school: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
    description: "",
  },
});

interface EducationCreateFormProps {
  onSuccess?: () => void;
}

export function EducationCreateForm({ onSuccess }: EducationCreateFormProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (values: typeof createOpts.defaultValues) =>
      createEducation({
        data: {
          resumeId: values.resumeId,
          school: values.school,
          degree: values.degree,
          field: values.field,
          startDate: values.startDate,
          endDate: values.endDate,
          description: values.description,
          sortOrder: 0,
        },
      }),
    onSuccess() {
      toast.success("Education created");
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.education] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.resumes] });
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to create education", {
        description: unwrapUnknownError(err).message,
      });
    },
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

        void form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <form.AppField
        name="resumeId"
        validators={{
          onChange: ({ value }) => (!value ? "Resume is required" : undefined),
        }}
      >
        {(field) => (
          <ResumePickerField
            value={field.state.value}
            onChange={field.handleChange}
            error={field.state.meta.errors?.[0]?.toString()}
          />
        )}
      </form.AppField>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField
          name="school"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "School is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">School</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
        <form.AppField
          name="degree"
          validators={{
            onChange: ({ value }) => (!value?.trim() ? "Degree is required" : undefined),
          }}
        >
          {(field) => (
            <div>
              <Label className="text-xs">Degree</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
      </div>
      <form.AppField name="field">
        {(field) => (
          <div>
            <Label className="text-xs">Field of Study</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField name="startDate">
          {(field) => (
            <div>
              <Label className="text-xs">Start Date</Label>
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
              <Label className="text-xs">End Date</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.AppField>
      </div>
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(
            values.resumeId && values.school.trim() && values.degree.trim(),
          );
          return (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={mutation.isPending}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !hasRequired || !form.state.isFormValid}
              >
                {mutation.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          );
        }}
      </form.Subscribe>
    </form>
  );
}

interface EducationCreateFormDilaogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
export function EducationCreateFormDilaog({ open, setOpen }: EducationCreateFormDilaogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Education</DialogTitle>
        </DialogHeader>
        <EducationCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
