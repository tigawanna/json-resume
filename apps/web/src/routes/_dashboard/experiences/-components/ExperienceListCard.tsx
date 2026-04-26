import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ExperienceListItemDTO } from "@/data-access-layer/resume/experiences/experience.types";
import { Briefcase, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ExperienceEditForm } from "./ExperienceEditForm";

interface ExperienceListCardProps {
  experience: ExperienceListItemDTO;
  onDelete?: (id: string) => void;
}

export function ExperienceListCard({ experience, onDelete }: ExperienceListCardProps) {
  const [open, setOpen] = useState(false);

  const dateRange = [experience.startDate, experience.endDate].filter(Boolean).join(" – ");

  return (
    <>
      <Card className="group relative" data-test={`experience-card-${experience.id}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Briefcase className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{experience.role}</CardTitle>
              <CardDescription className="mt-1 text-xs">{experience.company}</CardDescription>
              {dateRange && <p className="text-muted-foreground mt-1 text-xs">{dateRange}</p>}
              {experience.location && (
                <p className="text-muted-foreground text-xs">{experience.location}</p>
              )}
              <Badge variant="outline" className="mt-2 text-xs">
                {experience.resumeName}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setOpen(true)}
            data-test="experience-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
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
