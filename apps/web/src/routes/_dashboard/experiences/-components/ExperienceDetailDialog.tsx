import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Link } from "@tanstack/react-router";
import { ExternalLink, ListOrdered, MapPin, Pencil } from "lucide-react";
import type { ExperienceDisplayGroupDTO } from "./experience-display-groups";
import { getPrimaryExperience } from "./experience-display-groups";

interface ExperienceDetailContentProps {
  group: ExperienceDisplayGroupDTO;
  onEditSection: (experienceId: string) => void;
  onClose: () => void;
}

export function ExperienceDetailContent({
  group,
  onEditSection,
  onClose,
}: ExperienceDetailContentProps) {
  const primary = getPrimaryExperience(group);
  const dateRange = [group.startDate, group.endDate].filter(Boolean).join(" – ");
  const updatedLabel = new Date(group.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-1 pb-4">
          <p className="text-muted-foreground text-sm">{group.company}</p>
          {dateRange ? <p className="text-muted-foreground text-sm">{dateRange}</p> : null}
          {group.location ? (
            <p className="text-muted-foreground flex items-center gap-1 text-sm">
              <MapPin className="size-3.5 shrink-0" />
              {group.location}
            </p>
          ) : null}
        </div>

        <div className="space-y-6 pb-2">
          {group.resumeSections.length > 0 ? (
            group.resumeSections.map((section, index) => (
              <section key={`${section.resumeId}-${section.experienceId}`} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Resume
                    </Badge>
                    <Link
                      to="/resumes/$resumeId"
                      params={{ resumeId: section.resumeId }}
                      search={(prev) => ({ ...prev, tab: "edit" })}
                      className="text-foreground inline-flex min-w-0 items-center gap-1 text-sm font-medium hover:underline"
                      onClick={onClose}
                    >
                      <span className="truncate">{section.resumeName}</span>
                      <ExternalLink className="size-3.5 shrink-0" />
                    </Link>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditSection(section.experienceId);
                    }}
                    data-test={`experience-section-edit-btn-${section.experienceId}`}
                  >
                    <Pencil className="mr-1 size-3.5" />
                    Edit
                  </Button>
                </div>
                {section.bullets.length > 0 ? (
                  <ul className="text-muted-foreground space-y-2 pl-4 text-sm leading-relaxed">
                    {section.bullets.map((bullet) => (
                      <li key={bullet.id} className="list-disc">
                        {bullet.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No bullets added yet.</p>
                )}
                {index < group.resumeSections.length - 1 ? <Separator /> : null}
              </section>
            ))
          ) : (
            <section className="space-y-3">
              <p className="text-muted-foreground text-sm">
                This experience is not linked to any resume yet.
              </p>
              {primary.bullets.length > 0 ? (
                <ul className="text-muted-foreground space-y-2 pl-4 text-sm leading-relaxed">
                  {primary.bullets.map((bullet) => (
                    <li key={bullet.id} className="list-disc">
                      {bullet.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No bullets added yet.</p>
              )}
            </section>
          )}
        </div>
      </div>

      <DialogFooter className="bg-background mt-4 shrink-0 gap-3 border-t pt-4 sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="text-xs"
            title="Display order on resume (higher = appears first)"
          >
            <ListOrdered className="mr-1 size-3" />#{group.sortOrder}
          </Badge>
          <span className="text-muted-foreground text-xs">Updated {updatedLabel}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={(event) => {
            event.stopPropagation();
            onEditSection(primary.id);
          }}
          data-test="experience-detail-edit-btn"
        >
          <Pencil className="mr-1 size-3.5" />
          Edit details
        </Button>
      </DialogFooter>
    </>
  );
}
