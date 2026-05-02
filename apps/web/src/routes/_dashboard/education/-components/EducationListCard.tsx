import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EducationListItemDTO } from "@/data-access-layer/resume/education/education.types";
import { GraduationCap, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { EducationEditForm } from "./EducationEditForm";

interface EducationListCardProps {
  education: EducationListItemDTO;
  onDelete?: (id: string) => void;
}

export function EducationListCard({ education, onDelete }: EducationListCardProps) {
  const [open, setOpen] = useState(false);

  const dateRange = [education.startDate, education.endDate].filter(Boolean).join(" – ");
  const subtitle = [education.degree, education.field].filter(Boolean).join(" in ");

  return (
    <>
      <Card className="group flex flex-col" data-test={`education-card-${education.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3 min-w-0">
            <GraduationCap className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{education.school}</CardTitle>
              {subtitle && (
                <CardDescription className="mt-1 truncate text-xs">{subtitle}</CardDescription>
              )}
              {dateRange && <p className="text-muted-foreground mt-1 text-xs">{dateRange}</p>}
              <Badge variant="outline" className="mt-2 max-w-[12rem] truncate text-xs">
                {education.resumeName}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="mt-auto flex justify-end gap-1 px-3 py-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setOpen(true)}
            data-test="education-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onDelete?.(education.id)}
            data-test="education-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Education</DialogTitle>
          </DialogHeader>
          <EducationEditForm education={education} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
