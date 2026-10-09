import { JobPickerSheet } from "@/components/jobs/JobPickerSheet";
import { JobPreviewCard } from "@/components/jobs/JobPreviewCard";
import type { TargetJobDraft } from "@/components/resume/resume-workspace/resume-workspace-types";
import { useResumeWorkspace } from "@/components/resume/resume-workspace/ResumeWorkspaceContext";
import { Button } from "@/components/ui/button";
import type { ResumeJobDTO } from "@/data-access-layer/resume/resume.types";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Library, Pencil, Unlink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

/** The job this résumé is tailored to: link a tracked job, or paste a posting to track a new one. */
export function TargetJobSection() {
  const { resume, searches, attachJob } = useResumeWorkspace();
  const searchJobs = searches?.jobs;
  const job = resume.job;
  const [editing, setEditing] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);

  const attachMutation = useMutation({
    mutationFn: async (jobId: string | null) => attachJob(jobId),
    onSuccess(_, jobId) {
      toast.success(jobId ? "Job linked" : "Job detached");
      setEditing(false);
    },
    onError(err: unknown) {
      toast.error("Failed to update the target job", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["jobs"]] },
  });

  return (
    <div className="flex flex-col gap-3" data-test="target-job-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {job
            ? "AI tailoring and prompts use this job's description."
            : "Optional. Paste a posting to track it as a job, or link one you already saved."}
        </p>
        <div className="flex items-center gap-1">
          {searchJobs ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickOpen(true)}
              data-test="target-job-pick"
            >
              <Library className="mr-1 size-3" /> {job ? "Change job" : "Pick existing"}
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="sm">
            <Link to="/jobs">Manage jobs</Link>
          </Button>
        </div>
      </div>

      {job && !editing ? (
        <JobPreviewCard
          job={job}
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setEditing(true)}
                aria-label="Edit job"
                title="Edit job"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => attachMutation.mutate(null)}
                disabled={attachMutation.isPending}
                aria-label="Detach job"
                title="Detach job (keeps it in Jobs)"
              >
                <Unlink className="size-3.5" />
              </Button>
            </>
          }
        />
      ) : (
        <TargetJobForm
          key={job?.id ?? "new"}
          job={job}
          legacyDescription={job ? "" : resume.jobDescription}
          onSaved={() => setEditing(false)}
          onCancel={job ? () => setEditing(false) : undefined}
        />
      )}

      {searchJobs ? (
        <JobPickerSheet
          open={pickOpen}
          onOpenChange={setPickOpen}
          searchJobs={searchJobs}
          attachedJobId={job?.id}
          onPick={(picked) => attachMutation.mutate(picked.id)}
        />
      ) : null}
    </div>
  );
}

const targetJobOpts = formOptions({
  defaultValues: {
    description: "",
    company: "",
    title: "",
    location: "",
    url: "",
  } satisfies TargetJobDraft,
});

interface TargetJobFormProps {
  job: ResumeJobDTO | null;
  /** Posting text saved on the résumé before jobs were tracked separately. */
  legacyDescription: string;
  onSaved: () => void;
  onCancel?: () => void;
}

function TargetJobForm({ job, legacyDescription, onSaved, onCancel }: TargetJobFormProps) {
  const { saveTargetJob } = useResumeWorkspace();

  const mutation = useMutation({
    mutationFn: async (values: TargetJobDraft) => saveTargetJob(values),
    onSuccess() {
      toast.success(job ? "Job saved" : "Job saved and linked");
      onSaved();
    },
    onError(err: unknown) {
      toast.error("Failed to save job", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["resumes"], ["jobs"]] },
  });

  const form = useAppForm({
    ...targetJobOpts,
    defaultValues: {
      description: job?.description ?? legacyDescription,
      company: job?.company ?? "",
      title: job?.title ?? "",
      location: job?.location ?? "",
      url: job?.url ?? "",
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-4"
      data-test="target-job-form"
    >
      {legacyDescription ? (
        <p className="bg-base-200 text-base-content/80 rounded-md border px-3 py-2 text-xs">
          This posting was pasted on the résumé before jobs were tracked separately. Save it to move
          it into your jobs list.
        </p>
      ) : null}

      <form.AppField
        name="description"
        validators={{
          onChange: z.string().trim().min(1, "Paste the job description to save a job"),
        }}
      >
        {(field) => (
          <field.TextAreaField
            label="Job description"
            placeholder="Paste the full posting."
            data-test="target-job-description"
          />
        )}
      </form.AppField>

      <div className="grid gap-4 sm:grid-cols-2">
        <form.AppField name="company">
          {(field) => <field.TextField label="Company" placeholder="Optional" />}
        </form.AppField>
        <form.AppField name="title">
          {(field) => <field.TextField label="Role title" placeholder="Optional" />}
        </form.AppField>
        <form.AppField name="location">
          {(field) => <field.TextField label="Location" placeholder="Optional" />}
        </form.AppField>
        <form.AppField
          name="url"
          validators={{
            onChange: z.union([z.literal(""), z.url("Enter a full URL, e.g. https://…")]),
          }}
        >
          {(field) => <field.TextField label="Posting URL" placeholder="Optional" />}
        </form.AppField>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {job ? (
          <p className="text-muted-foreground mr-auto text-xs">
            Changes apply to this job everywhere it is linked.
          </p>
        ) : null}
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <form.AppForm>
          <form.SubmitButton label={job ? "Save job" : "Save & link job"} />
        </form.AppForm>
      </div>
    </form>
  );
}
