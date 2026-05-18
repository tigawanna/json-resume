import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ExperienceListItemDTO } from "@/data-access-layer/resume/experiences/experience.types";
import { ArrowDown, ArrowUp, Briefcase, ListOrdered, MapPin, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ExperienceDetailContent } from "./ExperienceDetailDialog";
import type { ExperienceDisplayGroupDTO } from "./experience-display-groups";
import { getPrimaryExperience } from "./experience-display-groups";
import { ExperienceEditForm } from "./ExperienceEditForm";

type ExperienceDialogView = "closed" | "detail" | "edit";

interface ExperienceListCardProps {
  group: ExperienceDisplayGroupDTO;
  onDelete?: (experienceIds: string[]) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function ExperienceListCard({
  group,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ExperienceListCardProps) {
  const [dialogView, setDialogView] = useState<ExperienceDialogView>("closed");
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [editReturnView, setEditReturnView] = useState<ExperienceDialogView>("closed");

  const primary = getPrimaryExperience(group);
  const dateRange = [group.startDate, group.endDate].filter(Boolean).join(" – ");
  const updatedLabel = new Date(group.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const resumeSections = group.resumeSections;

  const editingExperience: ExperienceListItemDTO | null = editingExperienceId
    ? (group.experiences.find((item) => item.id === editingExperienceId) ?? primary)
    : null;

  function openDetailDialog() {
    setEditingExperienceId(null);
    setDialogView("detail");
  }

  function openEditDialog(experienceId: string, returnView: ExperienceDialogView = "detail") {
    setEditingExperienceId(experienceId);
    setEditReturnView(returnView);
    setDialogView("edit");
  }

  function closeDialog() {
    setDialogView("closed");
    setEditingExperienceId(null);
    setEditReturnView("closed");
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) closeDialog();
  }

  return (
    <>
      <Card
        className="hover:border-primary/40 h-full cursor-pointer gap-4 py-5 transition-colors"
        data-test={`experience-card-${primary.id}`}
        onClick={openDetailDialog}
      >
        <CardHeader className="grid-cols-[1fr_auto] items-start gap-3 pb-0">
          <div className="flex min-w-0 items-start gap-3">
            <Briefcase className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-base leading-snug">{group.role}</CardTitle>
              <CardDescription className="text-sm">{group.company}</CardDescription>
              {dateRange ? <p className="text-muted-foreground text-xs">{dateRange}</p> : null}
              {group.location ? (
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <MapPin className="size-3 shrink-0" />
                  <span className="truncate">{group.location}</span>
                </p>
              ) : null}
            </div>
          </div>
          <div
            className="flex shrink-0 items-center gap-0.5"
            onClick={(event) => event.stopPropagation()}
          >
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
              onClick={() => openEditDialog(primary.id, "closed")}
              data-test="experience-edit-btn"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => onDelete?.(group.experiences.map((experience) => experience.id))}
              data-test="experience-delete-btn"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {resumeSections.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {resumeSections.map((section) => (
                <Badge key={section.resumeId} variant="outline" className="max-w-full text-xs">
                  <span className="truncate">{section.resumeName}</span>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Not linked to any resume yet.</p>
          )}
        </CardContent>

        <CardFooter className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <Badge
            variant="secondary"
            className="text-xs"
            title="Display order on resume (higher = appears first)"
          >
            <ListOrdered className="mr-1 size-3" />#{group.sortOrder}
          </Badge>
          <p className="text-muted-foreground text-xs">Updated {updatedLabel}</p>
        </CardFooter>
      </Card>

      <Dialog open={dialogView !== "closed"} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex max-h-[min(85vh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          {dialogView === "detail" ? (
            <div key="detail" className="flex max-h-[min(85vh,900px)] min-h-0 flex-col">
              <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
                <DialogTitle className="text-left text-xl leading-tight">{group.role}</DialogTitle>
              </DialogHeader>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6">
                <ExperienceDetailContent
                  group={group}
                  onEditSection={(experienceId) => openEditDialog(experienceId, "detail")}
                  onClose={closeDialog}
                />
              </div>
            </div>
          ) : null}

          {dialogView === "edit" && editingExperience ? (
            <div
              key={`edit-${editingExperience.id}`}
              className="flex max-h-[min(85vh,900px)] min-h-0 flex-col overflow-y-auto px-6 py-6"
            >
              <DialogHeader className="shrink-0 pb-4">
                <DialogTitle>
                  Edit Experience
                  {(() => {
                    const section = group.resumeSections.find(
                      (item) => item.experienceId === editingExperience.id,
                    );
                    return section ? ` — ${section.resumeName}` : "";
                  })()}
                </DialogTitle>
              </DialogHeader>
              <ExperienceEditForm
                key={editingExperience.id}
                experience={editingExperience}
                onSuccess={() => {
                  if (editReturnView === "detail") {
                    setDialogView("detail");
                    setEditingExperienceId(null);
                    return;
                  }
                  closeDialog();
                }}
                onCancel={() => {
                  if (editReturnView === "detail") {
                    setDialogView("detail");
                    setEditingExperienceId(null);
                    return;
                  }
                  closeDialog();
                }}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
