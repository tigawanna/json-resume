import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatHourlyUsd } from "@/data-access-layer/event-sourced/rows/pay-quote";
import {
  JOB_STATUS_LABELS,
  deleteJob,
  jobListLabel,
} from "@/data-access-layer/event-sourced/rows/job-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { unwrapUnknownError } from "@/utils/errors";
import { formatLocaleDateTime } from "@/utils/date-helpers";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Briefcase, ExternalLink, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { JobEditForm } from "../../-components/JobEditForm";

interface JobDetailPageProps {
  jobId: string;
}

export function JobDetailPage({ jobId }: JobDetailPageProps) {
  const db = useEventSourcedDb();
  const navigate = useNavigate();
  const { data, isLoading } = useLiveQuery(
    (query) => query.from({ job: db.collections.job }).where(({ job }) => eq(job.id, jobId)),
    [jobId],
  );
  const job = data?.[0];

  function handleDelete() {
    try {
      deleteJob(db, jobId);
      toast.success("Job deleted");
      void navigate({ to: "/jobs" });
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  if (isLoading) {
    return <RouterPendingComponent />;
  }

  if (!job) {
    return (
      <Empty className="border-border/40 border" data-test="job-not-found">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Briefcase />
          </EmptyMedia>
          <EmptyTitle>Job not found</EmptyTitle>
          <EmptyDescription>This job doesn&apos;t exist or may have been deleted.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/jobs" data-test="job-not-found-back">
              <ArrowLeft className="size-4" />
              Back to jobs
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const heading = jobListLabel(job);
  const payEstimate = formatHourlyUsd(job.hourlyMinCents, job.hourlyMaxCents);
  const payDisplay = payEstimate || job.payRate;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4" data-test="job-detail-page">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Button asChild variant="ghost" size="icon-sm">
              <Link to="/jobs" aria-label="Back to jobs" data-test="job-detail-back">
                <ArrowLeft />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold">{heading}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <Badge variant={job.status === "applied" ? "default" : "secondary"}>
                  {JOB_STATUS_LABELS[job.status]}
                </Badge>
                {payDisplay ? (
                  <span className="font-medium text-foreground">{payDisplay}</span>
                ) : null}
                {job.payBasis ? (
                  <span className="max-w-full truncate" title={job.payBasis}>
                    {job.payBasis}
                  </span>
                ) : null}
                {job.location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {job.location}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                Created {formatLocaleDateTime(job.createdAt)} · Updated{" "}
                {formatLocaleDateTime(job.updatedAt)}
              </p>
              {job.url ? (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-test={`job-external-link-${job.id}`}
                >
                  <ExternalLink className="size-3" />
                  Open original posting
                </a>
              ) : null}
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive shrink-0"
                aria-label="Delete job"
                data-test="job-delete"
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this job?</AlertDialogTitle>
                <AlertDialogDescription>
                  It is removed from every device that syncs this account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel size="sm" variant="outline">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction variant="destructive" size="sm" onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <section
        className="bg-base-100 rounded-lg border border-border p-4"
        aria-label="Edit job details"
      >
        <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Edit details
        </h2>
        <JobEditForm item={job} />
      </section>
    </div>
  );
}
