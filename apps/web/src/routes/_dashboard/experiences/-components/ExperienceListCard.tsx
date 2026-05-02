import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ExperienceListItemDTO } from "@/data-access-layer/resume/experiences/experience.types";
import { ArrowDown, ArrowUp, Briefcase, ListOrdered, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ExperienceEditForm } from "./ExperienceEditForm";

interface ExperienceListCardProps {
  experience: ExperienceListItemDTO;
  onDelete?: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function ExperienceListCard({
  experience,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ExperienceListCardProps) {
  const [open, setOpen] = useState(false);

  const dateRange = [experience.startDate, experience.endDate].filter(Boolean).join(" – ");

  return (
    <>
      <Card
        className="flex flex-row items-start gap-2 py-6"
        data-test={`experience-card-${experience.id}`}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <CardHeader className="space-y-0 p-0 px-6 pr-3 pb-2">
            <div className="flex min-w-0 items-start gap-3">
              <Briefcase className="text-primary mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">{experience.role}</CardTitle>
                <CardDescription className="mt-1 truncate text-xs">
                  {experience.company}
                </CardDescription>
                {dateRange && <p className="text-muted-foreground mt-1 text-xs">{dateRange}</p>}
                {experience.location && (
                  <p className="text-muted-foreground truncate text-xs">{experience.location}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 px-6 pr-3 pt-0">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="max-w-48 truncate text-xs">
                {experience.resumeName}
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs"
                title="Display order on resume (higher = appears first)"
              >
                <ListOrdered className="mr-1 size-3" />#{experience.sortOrder}
              </Badge>
            </div>
          </CardContent>
        </div>
        <div className="flex shrink-0 flex-col gap-0.5 pr-6">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={onMoveUp}
            disabled={!onMoveUp}
            title="Move up"
            data-test="experience-move-up-btn"
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={onMoveDown}
            disabled={!onMoveDown}
            title="Move down"
            data-test="experience-move-down-btn"
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => setOpen(true)}
            data-test="experience-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => onDelete?.(experience.id)}
            data-test="experience-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Experience</DialogTitle>
          </DialogHeader>
          <ExperienceEditForm experience={experience} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
