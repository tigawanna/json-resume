import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { getResumeCardDisplayName } from "@/utils/resume-display-name";
import { formatLocaleDate } from "@/utils/date-helpers";
import { ResourceCard } from "@/components/resource-card";
import { Link } from "@tanstack/react-router";
import { FileText, Plus, Sparkle } from "lucide-react";
import { useLiveQuery } from "@tanstack/react-db";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ResumeCreateFormDialog } from "../../resumes/-components/ResumeCreateForm";

export function RecentResumes({ onStartFromJob }: { onStartFromJob: () => void }) {
  const db = useEventSourcedDb();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: resumes, isLoading } = useLiveQuery((q) =>
    q
      .from({ row: db.collections.resume })
      .orderBy(({ row }) => row.createdAt, "desc")
      .limit(3),
  );

  if (isLoading || !resumes) return null;

  if (resumes.length === 0) {
    return (
      <div
        className="w-full flex flex-col items-center gap-4 py-8 text-center "
        data-test="dashboard-empty"
      >
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium">Nothing here yet</p>
          <p className="text-sm text-muted-foreground">
            Start from a job description, or from scratch.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={onStartFromJob}
            data-test="dashboard-start-from-job"
          >
            Start from a job description
            <Sparkle className="size-4" />
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => setCreateOpen(true)}
            data-test="dashboard-create-resume"
          >
            From scratch
            <Plus className="size-4" />
          </Button>
        </div>
        <ResumeCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
      </div>
    );
  }

  return (
    <section className="flex w-full flex-col gap-3" data-test="recent-resumes">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">Recent résumés</h2>
        <Button asChild variant="outline" size="sm">
          <Link to="/resumes">
            <FileText className="mr-1 size-4" />
            See all
          </Link>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {resumes.map((resume) => (
          <ResourceCard
            key={resume.id}
            dataTest={`recent-resume-${resume.id}`}
            className="h-full"
            link={
              <Link
                to="/resumes/$resumeId"
                params={{ resumeId: resume.id }}
                search={{ tab: "edit" }}
                aria-label={`Open ${getResumeCardDisplayName(resume)}`}
                data-test={`recent-resume-link-${resume.id}`}
              >
                <span className="sr-only">Open {getResumeCardDisplayName(resume)}</span>
              </Link>
            }
          >
            <div className="flex items-start gap-3 px-4 pt-4">
              <span className="bg-primary/12 text-primary grid size-9 shrink-0 place-items-center rounded-lg">
                <FileText className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-medium leading-tight">
                  {getResumeCardDisplayName(resume)}
                </p>
                {resume.headline ? (
                  <p className="text-muted-foreground truncate text-xs">{resume.headline}</p>
                ) : null}
              </div>
            </div>
            <div className="border-t px-4 py-2.5 text-xs text-muted-foreground mt-auto">
              Updated {formatLocaleDate(resume.updatedAt)}
            </div>
          </ResourceCard>
        ))}
      </div>
    </section>
  );
}
