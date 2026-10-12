import { Button } from "@/components/ui/button";
import { useViewer } from "@/data-access-layer/auth/viewer";
import {
  applicationAnswersText,
  compareApplicationAnswers,
  insertApplicationAnswer,
} from "@/data-access-layer/event-sourced/application-answer-rows";
import { jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { ApplicationAnswerEditor } from "@/features/application-answers/ApplicationAnswerEditor";
import { CopyTextButton } from "@/features/application-answers/CopyTextButton";
import { unwrapUnknownError } from "@/utils/errors";
import { useLiveQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import { ExternalLink, MessageSquareText, Plus } from "lucide-react";
import { toast } from "sonner";

interface ResumeAiAnswersPreviewProps {
  /** Job whose application to show; null falls back to the résumé's job, then the résumé. */
  jobId: string | null;
  resumeId: string;
}

export function ResumeAiAnswersPreview({ jobId, resumeId }: ResumeAiAnswersPreviewProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const { data } = useLiveQuery((q) => q.from({ row: db.collections.applicationAnswer }), []);
  const targetJobId = jobId ?? db.collections.resume.get(resumeId)?.jobId ?? null;
  const job = targetJobId ? db.collections.job.get(targetJobId) : undefined;
  const answers = (data ?? [])
    .filter((row) => (targetJobId ? row.jobId === targetJobId : row.resumeId === resumeId))
    .sort(compareApplicationAnswers);

  function addQuestion() {
    try {
      insertApplicationAnswer(db, viewer.user?.id, { resumeId, jobId: targetJobId, question: "" });
    } catch (err: unknown) {
      toast.error("Failed to add question", { description: unwrapUnknownError(err).message });
    }
  }

  const addButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1.5"
      onClick={addQuestion}
      data-test="resume-ai-answers-add"
    >
      <Plus className="size-3.5" />
      Question
    </Button>
  );

  if (answers.length === 0) {
    return (
      <div
        className="text-base-content/60 flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm"
        data-test="resume-ai-answers-empty"
      >
        <MessageSquareText className="size-6 opacity-60" />
        <p>No application answers for this job yet.</p>
        <p className="text-xs">
          Paste the questions from the application form, or type <code>/answer-questions</code>.
        </p>
        {addButton}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-test="resume-ai-answers">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {job ? jobListLabel(job) : "Application answers"}
        </span>
        <CopyTextButton
          text={applicationAnswersText(answers)}
          label="Copy all"
          copiedMessage="Questions and answers copied"
          dataTest="resume-ai-answers-copy-all"
        />
        {addButton}
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5">
          <Link
            to="/application-answers"
            search={targetJobId ? { jobId: targetJobId } : {}}
            data-test="resume-ai-answers-open"
            aria-label="Open in Application answers"
          >
            All
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto bg-base-200/40 p-3">
        {answers.map((row, index) => (
          <ApplicationAnswerEditor key={row.id} row={row} number={index + 1} />
        ))}
      </div>
    </div>
  );
}
