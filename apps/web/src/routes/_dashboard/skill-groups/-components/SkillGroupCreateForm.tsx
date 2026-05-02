import { ResumePickerField } from "@/components/custom-ui/ResumePickerField";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { createSkillGroup } from "@/data-access-layer/resume/resume.functions";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

const createOpts = formOptions({
  defaultValues: { resumeId: "", name: "" },
});

interface SkillGroupCreateFormProps {
  onSuccess?: () => void;
}

export function SkillGroupCreateForm({ onSuccess }: SkillGroupCreateFormProps) {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const mutation = useMutation({
    mutationFn: async (values: typeof createOpts.defaultValues) =>
      createSkillGroup({
        data: {
          resumeId: values.resumeId,
          name: values.name,
          skills,
          sortOrder: 0,
        },
      }),
    onSuccess() {
      toast.success("Skill group created");
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to create skill group", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [[queryKeyPrefixes.skillGroups], [queryKeyPrefixes.resumes]] },
  });

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  function handleSkillKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && skillInput.trim()) {
      e.preventDefault();
      const val = skillInput.trim().replace(/,$/g, "");
      if (val && !skills.includes(val)) setSkills((prev) => [...prev, val]);
      setSkillInput("");
    }
  }

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
      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) => (!value?.trim() ? "Group name is required" : undefined),
        }}
      >
        {(field) => (
          <div>
            <Label className="text-xs">Group Name</Label>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </form.AppField>
      <div>
        <Label className="text-xs">Skills</Label>
        <Input
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={handleSkillKeyDown}
          className="mt-1"
          placeholder="Type a skill and press Enter"
        />
        {skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {skills.map((s) => (
              <span
                key={s}
                className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs"
              >
                {s}
                <button
                  type="button"
                  onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const hasRequired = Boolean(values.resumeId && values.name.trim());
          return (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setSkills([]);
                }}
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
