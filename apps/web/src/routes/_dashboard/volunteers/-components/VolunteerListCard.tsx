import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { VolunteerListItemDTO } from "@/data-access-layer/resume/volunteers/volunteer.types";
import { Heart, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { VolunteerEditForm } from "./VolunteerEditForm";

interface VolunteerListCardProps {
  volunteer: VolunteerListItemDTO;
  onDelete?: (id: string) => void;
}

export function VolunteerListCard({ volunteer, onDelete }: VolunteerListCardProps) {
  const [open, setOpen] = useState(false);
  const dateRange = [volunteer.startDate, volunteer.endDate].filter(Boolean).join(" – ");
  return (
    <>
      <Card className="group relative" data-test={`volunteer-card-${volunteer.id}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Heart className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{volunteer.organization}</CardTitle>
              {volunteer.role && (
                <CardDescription className="mt-1 text-xs">{volunteer.role}</CardDescription>
              )}
              {dateRange && <p className="text-muted-foreground mt-1 text-xs">{dateRange}</p>}
              {volunteer.description && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                  {volunteer.description}
                </p>
              )}
              <Badge variant="outline" className="mt-2 text-xs">
                {volunteer.resumeName}
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
            data-test="volunteer-edit-btn"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onDelete?.(volunteer.id)}
            data-test="volunteer-delete-btn"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Volunteer</DialogTitle>
          </DialogHeader>
          <VolunteerEditForm volunteer={volunteer} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
