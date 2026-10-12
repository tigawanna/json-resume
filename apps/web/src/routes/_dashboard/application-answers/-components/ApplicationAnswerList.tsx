import { usePageSearchQuery } from "@/components/search/use-page-search-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useViewer } from "@/data-access-layer/auth/viewer";
import {
  applicationAnswersText,
  compareApplicationAnswers,
  insertApplicationAnswer,
} from "@/data-access-layer/event-sourced/application-answer-rows";
import { jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { ApplicationAnswer, Job } from "@/data-access-layer/event-sourced/schemas";
import { CopyTextButton } from "@/features/application-answers/CopyTextButton";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import { MessageSquareText, Plus, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { EventSourcedListScaffold } from "../../-components/EventSourcedListScaffold";
import { LibraryEmpty } from "../../-components/LibraryEmpty";
import { orIlike } from "../../-utils/list-query";
import { AddQuestionsDialog } from "./AddQuestionsDialog";
import { ApplicationAnswerEditor } from "@/features/application-answers/ApplicationAnswerEditor";
import { Route } from "..";

const ROUTE_ID = "/_dashboard/application-answers/" as const;
const TITLE = "Application answers";
const DESCRIPTION =
  "Questions from job application forms and your answers. The résumé assistant reuses these stories next time.";

type AnswerGroup = { jobId: string | null; job: Job | undefined; rows: ApplicationAnswer[] };

/** One group per job, the most recently edited application first. */
function groupByJob(rows: ReadonlyArray<ApplicationAnswer>, jobs: ReadonlyArray<Job>) {
  const groups = new Map<string | null, ApplicationAnswer[]>();
  for (const row of rows) {
    const key = row.jobId ?? null;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const latest = (group: ApplicationAnswer[]) => Math.max(...group.map((row) => row.updatedAt));
  return [...groups.entries()]
    .map(([jobId, group]): AnswerGroup => ({
      jobId,
      job: jobId ? jobs.find((job) => job.id === jobId) : undefined,
      rows: [...group].sort(compareApplicationAnswers),
    }))
    .sort((a, b) => latest(b.rows) - latest(a.rows));
}

export function ApplicationAnswerList() {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const navigate = Route.useNavigate();
  const { q = "", jobId } = Route.useSearch();
  const { clearSearch } = usePageSearchQuery(ROUTE_ID);
  const [addOpen, setAddOpen] = useState(false);
  const keyword = q.trim();

  const { data: rows, isLoading } = useLiveQuery(
    (query) => {
      let base = query.from({ row: db.collections.applicationAnswer });
      if (jobId) base = base.where(({ row }) => eq(row.jobId, jobId));
      return keyword ? base.where(({ row }) => orIlike(keyword, row.question, row.answer)) : base;
    },
    [keyword, jobId],
  );
  const { data: jobs } = useLiveQuery((query) => query.from({ job: db.collections.job }), []);

  const groups = groupByJob(rows ?? [], jobs ?? []);
  const filterJob = jobId ? jobs?.find((job) => job.id === jobId) : undefined;

  function addBlankQuestion(groupJobId: string | null) {
    try {
      insertApplicationAnswer(db, viewer.user?.id, { jobId: groupJobId, question: "" });
    } catch (err: unknown) {
      toast.error("Failed to add question", { description: unwrapUnknownError(err).message });
    }
  }

  const actions = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setAddOpen(true)}
      data-test="add-questions-btn"
    >
      <Plus className="mr-1 size-4" /> Add questions
    </Button>
  );

  const scaffold = (children: ReactNode) => (
    <EventSourcedListScaffold
      routeID={ROUTE_ID}
      title={TITLE}
      description={DESCRIPTION}
      searchPlaceholder="Search questions and answers…"
      actions={actions}
      filters={
        jobId ? (
          <Badge variant="secondary" className="gap-1 py-1" data-test="answers-job-filter">
            {filterJob ? jobListLabel(filterJob) : "One job"}
            <button
              type="button"
              aria-label="Show answers for every job"
              onClick={() => void navigate({ search: (prev) => ({ ...prev, jobId: undefined }) })}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ) : null
      }
      dataTest="application-answers-page"
    >
      {children}
      <AddQuestionsDialog open={addOpen} onOpenChange={setAddOpen} defaultJobId={jobId ?? null} />
    </EventSourcedListScaffold>
  );

  if (isLoading) return scaffold(<RouterPendingComponent />);

  if (groups.length === 0) {
    return scaffold(
      <LibraryEmpty
        icon={MessageSquareText}
        title="No application answers yet"
        description="Paste an application's questions into the résumé assistant (try /answer-questions) for starting points, or add them here."
        actionLabel="Add questions"
        onAction={() => setAddOpen(true)}
        hasSearch={keyword.length > 0}
        onClearSearch={clearSearch}
        dataTest="application-answers-empty"
      />,
    );
  }

  return scaffold(
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section
          key={group.jobId ?? "none"}
          className="flex flex-col gap-3"
          aria-label={group.job ? jobListLabel(group.job) : "Answers without a job"}
          data-test={`answers-group-${group.jobId ?? "none"}`}
        >
          <header className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">
              {group.job ? (
                <Link
                  to="/application-answers"
                  search={{ jobId: group.job.id }}
                  className="hover:underline"
                >
                  {jobListLabel(group.job)}
                </Link>
              ) : (
                "No job linked"
              )}
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {group.rows.length} {group.rows.length === 1 ? "question" : "questions"}
              </span>
            </h2>
            <CopyTextButton
              text={applicationAnswersText(group.rows)}
              label="Copy all"
              copiedMessage="Questions and answers copied"
              dataTest="answers-group-copy"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => addBlankQuestion(group.jobId)}
              data-test="answers-group-add"
            >
              <Plus className="size-4" /> Question
            </Button>
          </header>
          <div className="flex flex-col gap-3">
            {group.rows.map((row, index) => (
              <ApplicationAnswerEditor key={row.id} row={row} number={index + 1} />
            ))}
          </div>
        </section>
      ))}
    </div>,
  );
}
