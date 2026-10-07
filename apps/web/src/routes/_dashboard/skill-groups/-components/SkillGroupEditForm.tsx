import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResumeSkill, ResumeSkillGroup } from "@/data-access-layer/event-sourced/schemas";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { resolveSkillIds, setGroupSkills } from "@/data-access-layer/event-sourced/library-resolve";
import { joinSearchable, touchUpdatedAt } from "../../-utils/row-helpers";

const editOpts = formOptions({
  defaultValues: { name: "" },
});

interface SkillGroupEditFormProps {
  group: ResumeSkillGroup;
  skills: ResumeSkill[];
  onSuccess?: () => void;
}

export function SkillGroupEditForm({
  group,
  skills: initialSkills,
  onSuccess,
}: SkillGroupEditFormProps) {
  const db = useEventSourcedDb();
  const [pending, setPending] = useState(false);
  const [skills, setSkills] = useState(() => initialSkills.map((s) => s.name));
  const [skillInput, setSkillInput] = useState("");

  const form = useAppForm({
    ...editOpts,
    defaultValues: { name: group.name },
    onSubmit: async ({ value }) => {
      setPending(true);
      try {
        db.collections.resumeSkillGroup.update(group.id, (draft) => {
          draft.name = value.name;
          draft.searchableText = joinSearchable(value.name, ...skills);
          draft.updatedAt = touchUpdatedAt();
        });

        setGroupSkills(db, group.id, resolveSkillIds(db, group.userId ?? "", skills));

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
          placeholder="Type a skill and press Enter"
          className="mt-1"
        />
        {skills.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="bg-muted inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
                  className="hover:text-destructive"
                  aria-label={`Remove ${skill}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
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
