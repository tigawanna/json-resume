import {
  ResourceCard,
  ResourceCardActions,
  ResourceCardBody,
  ResourceCardFooter,
  ResourceCardHeader,
  ResourceCardMeta,
} from "@/components/resource-card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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

export function jobPayDisplay(
  job: Pick<Job, "hourlyMinCents" | "hourlyMaxCents" | "payRate">,
): string | undefined {
  const payEstimate = formatHourlyUsd(job.hourlyMinCents, job.hourlyMaxCents);
  return payEstimate || job.payRate || undefined;
}

export function JobCard({ job, onEdit, onDelete }: JobCardProps) {
  const heading = jobListLabel(job);
  const payDisplay = jobPayDisplay(job);
  const showPayRateAlongsideEstimate = Boolean(payDisplay) && job.payRate !== payDisplay;
  const identity =
    job.company && job.title
      ? `${job.company} · ${job.title}`
      : job.company || job.title || "Untitled job";

  return (
    <ResourceCard
      dataTest={`row-${job.id}`}
      className="h-full"
      link={
        <Link
          to="/jobs/$jobId"
          params={{ jobId: job.id }}
          aria-label={`Open ${heading}`}
          data-test={`job-card-link-${job.id}`}
        >
          <span className="sr-only">Open {heading}</span>
        </Link>
      }
    >
      <ResourceCardHeader
        title={heading}
        meta={
          <>
            <Badge
              variant={job.status === "applied" ? "default" : "secondary"}
              className="text-[10px]"
            >
              {JOB_STATUS_LABELS[job.status]}
            </Badge>
            {payDisplay ? <span className="font-medium text-foreground">{payDisplay}</span> : null}
            {showPayRateAlongsideEstimate ? <span className="truncate">{job.payRate}</span> : null}
            {job.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {job.location}
              </span>
            ) : null}
          </>
        }
        actions={
          <ResourceCardActions label="Job actions">
            {job.url ? (
              <DropdownMenuItem asChild>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  data-test={`job-external-link-${job.id}`}
                >
                  <ExternalLink className="text-muted-foreground" /> Open posting
                </a>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={onEdit} data-test="row-edit-btn">
              <Pencil className="text-muted-foreground" /> Edit job
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete} data-test="row-delete-btn">
              <Trash2 /> Delete job
            </DropdownMenuItem>
          </ResourceCardActions>
        }
      />

      {job.description ? (
        <ResourceCardBody className="text-muted-foreground text-xs whitespace-pre-wrap" clamp={3}>
          {jobDescriptionPreview(job.description, 240)}
        </ResourceCardBody>
      ) : (
        <div className="py-3" />
      )}

      <ResourceCardFooter className="flex items-center justify-between gap-3">
        <span className="truncate">{identity}</span>
        <span className="inline-flex shrink-0 items-center gap-1 transition-colors group-hover:text-foreground">
          View details
          <ArrowUpRight className="size-3" />
        </span>
      </ResourceCardFooter>
    </ResourceCard>
  );
}
