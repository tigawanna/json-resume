import { EntityPickerSheet } from "@/components/entity-picker/EntityPickerSheet";
import type { JobSummary } from "@/components/jobs/JobPreviewCard";
import {
  JOB_STATUS_LABELS,
  jobDescriptionPreview,
  jobListLabel,
} from "@/data-access-layer/event-sourced/job-rows";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";

interface JobPickerSheetProps<T extends JobSummary> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchJobs: (query: string) => Promise<T[]>;
  attachedJobId?: string | null;
  onPick: (job: T) => void;
}

export function JobPickerSheet<T extends JobSummary>({
  open,
  onOpenChange,
  searchJobs,
  attachedJobId,
  onPick,
}: JobPickerSheetProps<T>) {
  return (
    <EntityPickerSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Pick a tracked job"
      description="Click a job to link it as this résumé's target."
      searchPlaceholder="Search company, title, location or posting text…"
      attachedIds={attachedJobId ? [attachedJobId] : []}
      getSearchQueryKey={(q) => [queryKeyPrefixes.jobs, "picker", q]}
      getSearchQueryFn={(q) => () => searchJobs(q)}
      getItem={(job) => ({
        id: job.id,
        primary: jobListLabel(job),
        secondary: job.location || undefined,
        detail: jobDescriptionPreview(job.description, 160),
        badge: JOB_STATUS_LABELS[job.status],
      })}
      onPick={(rows) => {
        const job = rows[0];
        if (job) onPick(job);
      }}
    />
  );
}
