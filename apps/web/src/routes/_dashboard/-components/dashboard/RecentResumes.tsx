import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { getResumeCardDisplayName } from "@/utils/resume-display-name";
import { formatLocaleDate } from "@/utils/date-helpers";
import { ResourceCard } from "@/components/resource-card";
import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useLiveQuery } from "@tanstack/react-db";
import { Button } from "@/components/ui/button";

export function RecentResumes() {
  const db = useEventSourcedDb();
  const { data: resumes, isLoading } = useLiveQuery((q) =>
    q
      .from({ row: db.collections.resume })
      .orderBy(({ row }) => row.createdAt, "desc")
      .limit(3),
  );

  if (isLoading || !resumes || resumes.length === 0) return null;

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
