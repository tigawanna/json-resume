import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JOB_STATUS_LABELS, jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import type { JobStatus } from "@/data-access-layer/event-sourced/schemas";
import { cn } from "@/lib/utils";
import { Briefcase, ExternalLink, MapPin } from "lucide-react";
import { useState, type ReactNode } from "react";

export interface JobSummary {
  id: string;
  company: string;
  title: string;
  description: string;
  url: string;
  location: string;
  status: JobStatus;
}

interface JobPreviewCardProps {
  job: JobSummary;
  /** Buttons shown in the card header. */
  actions?: ReactNode;
  /** Start with the full description visible instead of a clamped preview. */
  expanded?: boolean;
  className?: string;
}

export function JobPreviewCard({ job, actions, expanded = false, className }: JobPreviewCardProps) {
  const [showAll, setShowAll] = useState(expanded);
  const isLong = job.description.length > 320;
  const heading = job.company.trim() || job.title.trim() ? jobListLabel(job) : "Untitled job";

  return (
    <div
      className={cn("bg-base-100 flex flex-col gap-2 rounded-lg border p-3", className)}
      data-test={`job-preview-${job.id}`}
    >
      <div className="flex items-start gap-3">
        <Briefcase className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-tight font-medium break-words">{heading}</p>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <Badge variant="outline" className="text-[10px]">
              {JOB_STATUS_LABELS[job.status]}
            </Badge>
            {job.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" /> {job.location}
              </span>
            ) : null}
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="size-3" /> Posting
              </a>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
      <p
        className={cn(
          "text-muted-foreground text-xs whitespace-pre-wrap",
          !showAll && "line-clamp-4",
        )}
      >
        {job.description}
      </p>
      {isLong ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto self-start p-0 text-xs"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "Show less" : "Show full description"}
        </Button>
      ) : null}
    </div>
  );
}
