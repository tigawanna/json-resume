import { PickFromExistingDialog } from "@/components/PickFromExistingDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchSkills, updateSkillGroups } from "@/data-access-layer/resume/resume.functions";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveQuery } from "@tanstack/react-db";
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

export function SkillsForm({ resumeId }: SkillsFormProps) {
  const { data: resume } = useLiveQuery((q) =>
    q
      .from({ resume: resumeCollection })
      .where(({ resume }) => eq(resume.id, resumeId))
      .findOne(),
  );

  const [groups, setGroups] = useState<SkillGroupDraft[]>(
    resume?.skillGroups.map((g) => ({
      name: g.name,
      items: g.skills.map((s) => s.name),
    })) ?? [],
  );
  const [pickOpen, setPickOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => updateSkillGroups({ data: { resumeId, groups } }),
    onSuccess() {
      toast.success("Skills saved");
      resumeCollection.utils.writeUpdate({
        id: resumeId,
        skillGroups: groups.map((g, gi) => ({
          id: "",
          resumeId,
          name: g.name,
          sortOrder: gi,
          skills: g.items.map((s, si) => ({
            id: "",
            groupId: "",
            name: s,
            level: null,
            sortOrder: si,
          })),
        })),
      });
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
              onClick={() => removeGroup(groupIndex)}>
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
                  onClick={() => removeSkillFromGroup(groupIndex, skillIndex)}>
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
        <Button variant="outline" size="sm" onClick={() => setPickOpen(true)}>
          <Library className="mr-1 size-3" /> Pick from Existing
        </Button>
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Save Skills
        </Button>
      </div>

      <PickFromExistingDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        title="Pick from Existing Skills"
        description="Search skills from your other resumes."
        multi
        getSearchQueryKey={(q) => ["resumes", "search", "skills", q]}
        getSearchQueryFn={(q) => () => searchSkills({ data: { query: q } })}
        mapToItems={(data) =>
          data.map((s: { id: string; name: string; groupName?: string }) => ({
            id: s.id,
            primary: s.name,
            secondary: s.groupName,
          }))
        }
        onPick={(items) => {
          if (groups.length === 0) {
            setGroups([{ name: "Skills", items: items.map((i) => i.primary) }]);
          } else {
            const lastIdx = groups.length - 1;
            setGroups((prev) =>
              prev.map((g, i) =>
                i === lastIdx
                  ? {
                      ...g,
                      items: [...g.items, ...items.map((it) => it.primary)],
                    }
                  : g,
              ),
            );
          }
          toast.success(`Added ${items.length} skill(s)`);
        }}
      />
    </div>
  );
}
