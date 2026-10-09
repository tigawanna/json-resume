import { EntityPickerSheet } from "@/components/entity-picker/EntityPickerSheet";
import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { Library, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SkillsFormProps {
  resumeId: string;
}

interface SkillGroupDraft {
  name: string;
  items: string[];
}

function skillGroupsToDraft(
  skillGroups: { name: string; skills: { name: string }[] }[],
): SkillGroupDraft[] {
  return skillGroups.map((g) => ({
    name: g.name,
    items: g.skills.map((s) => s.name),
  }));
}

function skillGroupDraftsEqual(a: SkillGroupDraft[], b: SkillGroupDraft[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function SkillsForm({ resumeId }: SkillsFormProps) {
  const { resume, updateSkillGroups, searches } = useResumeWorkspace();
  const searchSkills = searches?.skills;

  const savedGroups = resume ? skillGroupsToDraft(resume.skillGroups) : [];
  const [groups, setGroups] = useState<SkillGroupDraft[]>(savedGroups);
  const isDirty = !skillGroupDraftsEqual(groups, savedGroups);
  const [pickOpen, setPickOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => updateSkillGroups(groups),
    onSuccess() {
      toast.success("Skills saved");
    },
    onError(err: unknown) {
      toast.error("Failed to save skills", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"]] },
  });

  if (!resume) return null;

  function addGroup() {
    setGroups((prev) => [...prev, { name: "", items: [] }]);
  }

  function removeGroup(index: number) {
    setGroups((prev) => prev.filter((_, i) => i !== index));
  }

  function updateGroupName(index: number, name: string) {
    setGroups((prev) => prev.map((g, i) => (i === index ? { ...g, name } : g)));
  }

  function addSkillToGroup(groupIndex: number, skill: string) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex && !g.items.includes(skill) ? { ...g, items: [...g.items, skill] } : g,
      ),
    );
  }

  function removeSkillFromGroup(groupIndex: number, skillIndex: number) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, items: g.items.filter((_, si) => si !== skillIndex) } : g,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-4" data-test="skills-form">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={group.name}
              onChange={(e) => updateGroupName(groupIndex, e.target.value)}
              placeholder="Group name (e.g. Languages)"
              className="h-8 font-medium"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => removeGroup(groupIndex)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {group.items.map((skill, skillIndex) => (
              <Badge key={skillIndex} variant="secondary" className="text-xs">
                {skill}
                <button
                  type="button"
                  className="ml-1"
                  onClick={() => removeSkillFromGroup(groupIndex, skillIndex)}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            className="mt-2 h-7 text-sm"
            placeholder="Type skill and press Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                const val = e.currentTarget.value.trim();
                if (val) {
                  addSkillToGroup(groupIndex, val);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
        </div>
      ))}

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addGroup}>
          <Plus className="mr-1 size-3" /> Add Group
        </Button>
        {searchSkills && (
          <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
            <Library className="mr-1 size-3" /> Pick from Existing
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={!isDirty || mutation.isPending}
        >
          Save Skills
        </Button>
      </div>

      {searchSkills && (
        <EntityPickerSheet
          open={pickOpen}
          onOpenChange={setPickOpen}
          title="Pick from Existing Skills"
          description="Adds the picked skills to your last group. Save Skills to keep them."
          searchPlaceholder="Search skills…"
          multi
          pageSize={15}
          getSearchQueryKey={(q) => [queryKeyPrefixes.resumes, "search", "skills", q]}
          getSearchQueryFn={(q) => () => searchSkills(q)}
          getItem={(s) => ({ id: s.id, primary: s.name, secondary: s.groupName })}
          onPick={(rows) => {
            const names = rows.map((s) => s.name);
            if (groups.length === 0) {
              setGroups([{ name: "Skills", items: names }]);
            } else {
              const lastIdx = groups.length - 1;
              setGroups((prev) =>
                prev.map((g, i) =>
                  i === lastIdx ? { ...g, items: [...new Set([...g.items, ...names])] } : g,
                ),
              );
            }
            toast.success(`Added ${rows.length} skill(s)`);
          }}
        />
      )}
    </div>
  );
}
