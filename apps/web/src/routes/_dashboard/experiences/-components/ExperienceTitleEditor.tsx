import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { ResumeExperience } from "@/data-access-layer/event-sourced/schemas";
import { formatLocaleDate } from "@/utils/date-helpers";
import { unwrapUnknownError } from "@/utils/errors";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { joinSearchable, touchUpdatedAt } from "../../-utils/row-helpers";
import { ExperienceBulletsEditor } from "./ExperienceBulletsEditor";

interface ExperienceTitleEditorProps {
  experience: ResumeExperience;
  onDelete: () => void;
}

export function ExperienceTitleEditor({ experience, onDelete }: ExperienceTitleEditorProps) {
  const db = useEventSourcedDb();
  const [role, setRole] = useState(experience.role);
  const [location, setLocation] = useState(experience.location);
  const [pendingTitle, setPendingTitle] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(false);

  function handleSaveTitle() {
    if (!role.trim()) return;
    setPendingTitle(true);
    try {
      db.collections.resumeExperience.update(experience.id, (draft) => {
        draft.role = role.trim();
        draft.searchableText = joinSearchable(
          role.trim(),
          draft.company,
          draft.location,
          draft.startDate,
          draft.endDate,
        );
        draft.updatedAt = touchUpdatedAt();
      });
      toast.success("Experience saved");
    } catch (err: unknown) {
      toast.error("Failed to save experience", {
        description: unwrapUnknownError(err).message,
      });
    } finally {
      setPendingTitle(false);
    }
  }

  function handleSaveLocation() {
    setPendingLocation(true);
    try {
      db.collections.resumeExperience.update(experience.id, (draft) => {
        draft.location = location.trim();
        draft.searchableText = joinSearchable(
          draft.role,
          draft.company,
          location.trim(),
          draft.startDate,
          draft.endDate,
        );
        draft.updatedAt = touchUpdatedAt();
      });
      toast.success("Experience saved");
    } catch (err: unknown) {
      toast.error("Failed to save experience", {
        description: unwrapUnknownError(err).message,
      });
    } finally {
      setPendingLocation(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-3 sm:grid-cols-2 flex-1">
          <div>
            <Label className="text-xs" htmlFor={`experience-title-${experience.id}`}>
              Title
            </Label>
            <Input
              id={`experience-title-${experience.id}`}
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="mt-1"
              data-test="experience-title"
            />
          </div>
          <div>
            <Label className="text-xs" htmlFor={`experience-location-${experience.id}`}>
              Location
            </Label>
            <Input
              id={`experience-location-${experience.id}`}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="mt-1"
              data-test="experience-location"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive size-8 shrink-0"
          onClick={onDelete}
          data-test="experience-title-delete-btn"
          aria-label={`Delete title ${experience.role}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleSaveTitle}
          disabled={pendingTitle || !role.trim()}
          data-test="experience-save"
        >
          {pendingTitle ? "Saving…" : "Save title"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSaveLocation}
          disabled={pendingLocation}
          data-test="experience-save-location"
        >
          {pendingLocation ? "Saving…" : "Save location"}
        </Button>
        <span className="ml-auto self-center text-xs text-muted-foreground tabular-nums">
          Updated {formatLocaleDate(experience.updatedAt)}
        </span>
      </div>
      <ExperienceBulletsEditor experienceId={experience.id} />
    </div>
  );
}
