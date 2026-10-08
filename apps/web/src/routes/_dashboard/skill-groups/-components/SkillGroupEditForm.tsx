import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResumeSkillGroup } from "@/data-access-layer/event-sourced/schemas";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { joinSearchable, touchUpdatedAt } from "../../-utils/row-helpers";

const editOpts = formOptions({
  defaultValues: { name: "" },
});

interface SkillGroupEditFormProps {
  group: ResumeSkillGroup;
  onSuccess?: () => void;
}

/** Renames a group everywhere it is used; skills stay a per-résumé choice. */
export function SkillGroupEditForm({ group, onSuccess }: SkillGroupEditFormProps) {
  const db = useEventSourcedDb();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...editOpts,
    defaultValues: { name: group.name },
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        db.collections.resumeSkillGroup.update(group.id, (draft) => {
          draft.name = value.name.trim();
          draft.searchableText = joinSearchable(value.name);
          draft.updatedAt = touchUpdatedAt();
        });
        toast.success("Skill group saved");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to save skill group", {
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
      data-test="skill-group-edit-form"
    >
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
              data-test="skill-group-name-input"
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
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        )}
      </form.Subscribe>
    </form>
  );
}
