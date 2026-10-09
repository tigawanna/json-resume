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
import { useViewer } from "@/data-access-layer/auth/viewer";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { resolveSkillGroup } from "@/data-access-layer/event-sourced/library-resolve";

const createOpts = formOptions({
  defaultValues: { name: "" },
});

interface SkillGroupCreateFormProps {
  onSuccess?: () => void;
}

/** A group is a reusable name; each résumé picks which skills it shows under it. */
export function SkillGroupCreateForm({ onSuccess }: SkillGroupCreateFormProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [pending, setPending] = useState(false);

  const form = useAppForm({
    ...createOpts,
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        const userId = viewer.user?.id ?? "";
        const before = db.collections.resumeSkillGroup.toArray.length;
        resolveSkillGroup(db, userId, value.name);
        const created = db.collections.resumeSkillGroup.toArray.length > before;
        toast.success(created ? "Skill group created" : "Skill group already in library");
        onSuccess?.();
      } catch (err: unknown) {
        toast.error("Failed to create skill group", {
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
      data-test="skill-group-create-form"
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
            <p className="text-base-content/60 mt-1 text-xs">
              Skills are picked per résumé in the editor.
            </p>
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

interface SkillGroupCreateFormDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function SkillGroupCreateFormDialog({ open, setOpen }: SkillGroupCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Skill Group</DialogTitle>
          <DialogDescription>
            Add a skill group to your library so any résumé can reuse it.
          </DialogDescription>
        </DialogHeader>
        <SkillGroupCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
