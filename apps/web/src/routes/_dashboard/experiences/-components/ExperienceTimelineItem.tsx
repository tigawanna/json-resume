import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteWithReferences } from "@/data-access-layer/event-sourced/rows/library-resolve";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { unwrapUnknownError } from "@/utils/errors";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatLibraryDateRange } from "../../-components/LibraryEntityCard";
import { splitCompanyHint } from "../-utils/split-company";
import type { ExperienceGroupData } from "./ExperienceGroup";

interface ExperienceTimelineItemProps {
  group: ExperienceGroupData;
}

export function ExperienceTimelineItem({ group }: ExperienceTimelineItemProps) {
  const db = useEventSourcedDb();
  const { name: companyName, hint } = splitCompanyHint(group.company);
  const dateRange = formatLibraryDateRange(group.startDate, group.endDate);
  const titlePreview = group.titles.map((t) => t.role).join(", ");
  const locations = [...new Set(group.titles.map((t) => t.location).filter(Boolean))];

  function handleDeleteGroup() {
    try {
      for (const title of group.titles) {
        deleteWithReferences(db, "resumeExperience", title.id);
      }
      toast.success("Experience deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  return (
    <li className="relative min-w-0 pl-6 md:pl-8">
      <span
        aria-hidden
        className="bg-primary/30 absolute top-5 left-[7px] h-full w-px md:left-[7px]"
      />
      <span
        aria-hidden
        className="bg-primary border-background absolute top-5 left-0 size-3.5 rounded-full border-2 md:top-5"
      />
      <div
        data-test={`row-${group.groupId}`}
        className="group relative flex flex-col gap-3 rounded-lg border border-border bg-base-100 p-4 transition-colors hover:border-primary/40"
      >
        <Link
          to="/experiences/$experienceId"
          params={{ experienceId: group.groupId }}
          className="absolute inset-0"
          data-test="experience-detail-link"
          aria-label={`Open ${companyName} ${dateRange}`}
        >
          <span className="sr-only">
            Open {companyName} {dateRange}
          </span>
        </Link>

        <div className="relative z-10 flex flex-col gap-2 pointer-events-none">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3 pointer-events-none">
              <Briefcase className="text-primary mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate text-base leading-snug font-semibold">{companyName}</p>
                  {hint ? (
                    <Badge variant="outline" className="text-[11px]">
                      {hint}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {group.titles.length > 1
                    ? `${group.titles.length} titles · ${titlePreview}`
                    : titlePreview}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {dateRange ? <span>{dateRange}</span> : null}
                  {locations.length > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{locations.join(", ")}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 pointer-events-auto">
              <span className="mr-1 hidden items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground sm:inline-flex">
                Details
                <ArrowRight className="size-3" />
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive size-8"
                onClick={handleDeleteGroup}
                data-test="row-delete-btn"
                aria-label="Delete"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {group.titles.map((title) => (
              <Badge
                key={title.id}
                variant="secondary"
                className={cn("max-w-full truncate", "text-[11px]")}
                title={title.role}
              >
                {title.role}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}
