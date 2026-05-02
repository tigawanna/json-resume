import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { editSkillGroup } from "@/data-access-layer/resume/resume.functions";
// import { skillGroupsCollection } from "@/data-access-layer/resume/skill-groups/skill-group.collection";
import type { SkillGroupListItemDTO } from "@/data-access-layer/resume/skill-groups/skill-group.types";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function parseSkills(skills: string): string[] {
  try {
    const parsed: unknown = JSON.parse(skills);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const skillGroupEditOpts = formOptions({
  defaultValues: { name: "" },
});

interface SkillGroupEditFormProps {
  skillGroup: SkillGroupListItemDTO;
  onSuccess?: () => void;
}

export function SkillGroupEditForm({ skillGroup, onSuccess }: SkillGroupEditFormProps) {
  const [skills, setSkills] = useState(() => parseSkills(skillGroup.skills));

  const mutation = useMutation({
    mutationFn: async (values: typeof skillGroupEditOpts.defaultValues) =>
      editSkillGroup({ data: { id: skillGroup.id, ...values, skills } }),
    onSuccess() {
      toast.success("Skill group saved");
      // skillGroupsCollection.utils.writeUpdate({
      //   ...skillGroup,
      //   ...values,
      //   skills: JSON.stringify(skills),
      // });
      onSuccess?.();
    },
    onError(err: unknown) {
      toast.error("Failed to save skill group", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [[queryKeyPrefixes.skillGroups], [queryKeyPrefixes.resumes]] },
  });

  const form = useAppForm({
    ...skillGroupEditOpts,
    defaultValues: { name: skillGroup.name },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val && !skills.includes(val)) {
        setSkills((prev) => [...prev, val]);
        e.currentTarget.value = "";
      }
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
        <Label className="text-xs">Skills (press Enter to add)</Label>
        <Input
          onKeyDown={handleSkillKeyDown}
          placeholder="e.g. React"
          className="mt-1"
          disabled={mutation.isPending}
        />
        {skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {skills.map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">
                {s}
                <button
                  type="button"
                  className="ml-1"
                  onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                  disabled={mutation.isPending}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.reset();
            setSkills(parseSkills(skillGroup.skills));
          }}
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
