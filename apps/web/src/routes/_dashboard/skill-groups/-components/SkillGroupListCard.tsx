import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SkillGroupListItemDTO } from "@/data-access-layer/resume/skill-groups/skill-group.types";
import { Layers, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { SkillGroupEditForm } from "./SkillGroupEditForm";

function parseSkills(skills: string): string[] {
  try {
    const parsed: unknown = JSON.parse(skills);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

interface SkillGroupListCardProps {
  skillGroup: SkillGroupListItemDTO;
  onDelete?: (id: string) => void;
}

export function SkillGroupListCard({ skillGroup, onDelete }: SkillGroupListCardProps) {
  const [open, setOpen] = useState(false);
  const displaySkills = parseSkills(skillGroup.skills);
  return (
    <>
      <Card
        className="flex flex-row items-start gap-2 py-6"
        data-test={`skill-group-card-${skillGroup.id}`}
      >
        <CardHeader className="min-w-0 flex-1 space-y-0 p-0 px-6 pr-3 pb-0">
          <div className="flex min-w-0 items-start gap-3">
            <Layers className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{skillGroup.name}</CardTitle>
              {displaySkills.length > 0 && (
                <CardDescription className="mt-1 text-xs">
                  {displaySkills.length} skill{displaySkills.length !== 1 ? "s" : ""}
                </CardDescription>
              )}
              {displaySkills.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {displaySkills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
              <Badge variant="outline" className="mt-2 max-w-[12rem] truncate text-xs">
                {skillGroup.resumeName}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <div className="flex shrink-0 flex-col gap-0.5 pr-6">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => setOpen(true)}
            data-test="skill-group-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => onDelete?.(skillGroup.id)}
            data-test="skill-group-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Skill Group</DialogTitle>
          </DialogHeader>
          <SkillGroupEditForm skillGroup={skillGroup} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
