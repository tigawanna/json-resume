import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatHourlyUsd } from "@/data-access-layer/event-sourced/rows/pay-quote";
import {
  JOB_STATUS_LABELS,
  jobDescriptionPreview,
  jobListLabel,
} from "@/data-access-layer/event-sourced/rows/job-rows";
import type { Job } from "@/data-access-layer/event-sourced/schemas";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ExternalLink, MapPin, Pencil, Trash2 } from "lucide-react";

interface JobCardProps {
  job: Job;
  onEdit: () => void;
  onDelete: () => void;
}

export function JobCard({ job, onEdit, onDelete }: JobCardProps) {
  const heading = jobListLabel(job);
  const payEstimate = formatHourlyUsd(job.hourlyMinCents, job.hourlyMaxCents);
  const payDisplay = payEstimate || job.payRate;
  const showPayRateAlongsideEstimate =
    Boolean(payEstimate) && Boolean(job.payRate) && job.payRate !== payEstimate;

  return (
    <div
      data-test={`row-${job.id}`}
      className="group relative flex flex-col gap-3 rounded-lg border border-border bg-base-100 p-4 transition-colors hover:border-primary/40"
    >
      <Link
        to="/jobs/$jobId"
        params={{ jobId: job.id }}
        className="absolute inset-0"
        aria-label={`Open ${heading}`}
        data-test={`job-card-link-${job.id}`}
      >
        <span className="sr-only">Open {heading}</span>
      </Link>

      <div className="relative z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{heading}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <Badge
                variant={job.status === "applied" ? "default" : "secondary"}
                className="text-[10px]"
              >
                {JOB_STATUS_LABELS[job.status]}
              </Badge>
              {payDisplay ? (
                <span className="font-medium text-foreground">{payDisplay}</span>
              ) : null}
              {showPayRateAlongsideEstimate ? (
                <span className="truncate">{job.payRate}</span>
              ) : null}
              {job.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {job.location}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 pointer-events-auto">
            {job.url ? (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Open original posting"
              >
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  data-test={`job-external-link-${job.id}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onEdit}
              data-test="row-edit-btn"
              aria-label="Edit"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive size-8"
              onClick={onDelete}
              data-test="row-delete-btn"
              aria-label="Delete"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {job.description ? (
          <p className="text-muted-foreground text-xs whitespace-pre-wrap line-clamp-3">
            {jobDescriptionPreview(job.description, 240)}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>
            {job.company && job.title
              ? `${job.company} · ${job.title}`
              : job.company || job.title || "Untitled job"}
          </span>
          <span className="inline-flex items-center gap-1 group-hover:text-foreground">
            View details
            <ArrowUpRight className="size-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
