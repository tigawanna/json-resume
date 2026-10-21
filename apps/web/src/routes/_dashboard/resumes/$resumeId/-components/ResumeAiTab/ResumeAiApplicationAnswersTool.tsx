import { Button } from "@/components/ui/button";
import { applicationAnswersText } from "@/data-access-layer/event-sourced/rows/application-answer-rows";
import { CopyTextButton } from "@/features/application-answers/CopyTextButton";
import type { ToolProps } from "@tanstack/ai-react/ui";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Eye, MessageSquareText } from "lucide-react";
import { useResumeWorkbenchActions } from "../resume-workbench/ResumeWorkbenchProvider";
import { ResumeAiToolCall } from "./ResumeAiToolWidgets";
import type { ResumeAiChatOptions } from "./resume-ai-chat-options";

export function ResumeAiSaveApplicationAnswersTool({
  part,
  result,
}: ToolProps<ResumeAiChatOptions, "save_application_answers">) {
  const { focusAnswers } = useResumeWorkbenchActions();
  const saved = part.output ?? undefined;
  const first = saved?.answers[0];
  const jobId = first?.jobId ?? null;
  const gaps = saved?.answers.reduce((total, row) => total + row.placeholders, 0) ?? 0;
  let answersSearch: { resumeIds: string[] } | { jobId: string } | Record<string, never> = {};
  if (first?.resumeId) answersSearch = { resumeIds: [first.resumeId] };
  else if (jobId) answersSearch = { jobId };

  return (
    <>
      <ResumeAiToolCall part={part} result={result} />
      {saved && first ? (
        <div
          className="rounded-lg bg-[color-mix(in_oklch,var(--color-success)_9%,var(--color-base-100))] p-3 text-sm ring-1 ring-[color-mix(in_oklch,var(--color-success)_25%,transparent)]"
          data-test="resume-ai-answers-card"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
              <MessageSquareText className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {first.jobLabel ?? "Application answers"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {saved.answers.length} {saved.answers.length === 1 ? "answer" : "answers"} saved
                {gaps > 0
                  ? ` · ${gaps} ${gaps === 1 ? "detail" : "details"} for you to fill in`
                  : ""}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-1.5">
            <CopyTextButton
              text={applicationAnswersText(saved.answers)}
              label="Copy all"
              copiedMessage="Questions and answers copied"
              dataTest="resume-ai-answers-card-copy"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => focusAnswers(jobId, "always")}
              data-test="resume-ai-answers-card-preview"
            >
              <Eye className="size-3.5" />
              Preview
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link
                to="/application-answers"
                search={answersSearch}
                data-test="resume-ai-answers-card-edit"
              >
                Edit
                <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
