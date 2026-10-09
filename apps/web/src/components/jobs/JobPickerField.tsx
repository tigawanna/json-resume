import { JobPickerSheet } from "@/components/jobs/JobPickerSheet";
import { JobPreviewCard, type JobSummary } from "@/components/jobs/JobPreviewCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import { Briefcase, Replace, Unlink } from "lucide-react";
import { useState } from "react";

interface JobPickerFieldProps<T extends JobSummary> {
  label?: string;
  value: T | null;
  onChange: (job: T | null) => void;
  searchJobs: (query: string) => Promise<T[]>;
}

/** Picks a tracked job in a drawer and previews the one that is linked. */
export function JobPickerField<T extends JobSummary>({
  label = "Target job",
  value,
  onChange,
  searchJobs,
}: JobPickerFieldProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1" data-test="resume-job-picker">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        <Link to="/jobs" className="text-primary text-xs hover:underline">
          Manage jobs
        </Link>
      </div>
      {value ? (
        <JobPreviewCard
          job={value}
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setOpen(true)}
                aria-label="Change job"
                title="Change job"
              >
                <Replace className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onChange(null)}
                aria-label="Detach job"
                title="Detach job"
              >
                <Unlink className="size-3.5" />
              </Button>
            </>
          }
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          className="justify-start border-dashed"
          onClick={() => setOpen(true)}
          data-test="resume-job-picker-open"
        >
          <Briefcase className="size-4" />
          No job linked — pick one
        </Button>
      )}
      <JobPickerSheet
        open={open}
        onOpenChange={setOpen}
        searchJobs={searchJobs}
        attachedJobId={value?.id}
        onPick={onChange}
      />
    </div>
  );
}
