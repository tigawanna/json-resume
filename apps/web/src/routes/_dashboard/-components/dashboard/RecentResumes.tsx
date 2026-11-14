import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { getResumeCardDisplayName } from "@/utils/resume-display-name";
import { formatLocaleDate } from "@/utils/date-helpers";
import { ResourceCard } from "@/components/resource-card";
import { Link } from "@tanstack/react-router";
import { FileText, Plus, Sparkles } from "lucide-react";
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

  const startCard = (
    <ResourceCard
      dataTest="dashboard-open-assistant"
      className="h-full border-4 border-primary/80 bg-primary/15 hover:border-primary/80 hover:bg-primary/20"
      onClick={onStartFromJob}
    >
      <div className="flex h-full items-start gap-3 px-4 py-4">
        <span className="bg-primary/12 text-primary grid size-9 shrink-0 place-items-center rounded-lg">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium leading-tight">Let's get started</p>
          <p className="text-muted-foreground text-xs">
            Post a job description to get a tailored résumé
          </p>
        </div>
      </div>
    </ResourceCard>
  );

  return (
    <section
      className="flex w-full flex-col gap-3"
      data-test={resumes.length === 0 ? "dashboard-empty" : "recent-resumes"}
    >
      {resumes.length > 0 ? (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">Recent résumés</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/resumes">
              <FileText className="mr-1 size-4" />
              See all
            </Link>
          </Button>
        </div>
      ) : null}
      <div
        className={
          resumes.length === 0
            ? "mx-auto grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2"
            : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        }
      >
        {startCard}
        {resumes.length === 0 ? (
          <ResourceCard
            dataTest="dashboard-create-resume"
            className="h-full"
            onClick={() => setCreateOpen(true)}
          >
            <div className="flex h-full items-start gap-3 px-4 py-4">
              <span className="bg-primary/12 text-primary grid size-9 shrink-0 place-items-center rounded-lg">
                <Plus className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium leading-tight">From scratch</p>
                <p className="text-muted-foreground text-xs">Start a blank résumé</p>
              </div>
            </div>
          </ResourceCard>
        ) : null}
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
      <ResumeCreateFormDialog open={createOpen} setOpen={setCreateOpen} />
    </section>
  );
}
