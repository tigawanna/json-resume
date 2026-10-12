import { Button } from "@/components/ui/button";
import type { ToolProps } from "@tanstack/ai-react/ui";
import { Link } from "@tanstack/react-router";
import { Eye, ExternalLink, Mail } from "lucide-react";
import { useResumeWorkbenchActions } from "../resume-workbench/ResumeWorkbenchProvider";
import { ResumeAiToolCall } from "./ResumeAiToolWidgets";
import type { ResumeAiChatOptions } from "./resume-ai-chat-options";

export function ResumeAiSaveCoverLetterTool({
  part,
  result,
}: ToolProps<ResumeAiChatOptions, "save_cover_letter">) {
  const { focusCoverLetter } = useResumeWorkbenchActions();
  const saved = part.output ?? undefined;

  return (
    <>
      <ResumeAiToolCall part={part} result={result} />
      {saved ? (
        <div
          className="rounded-lg bg-[color-mix(in_oklch,var(--color-success)_9%,var(--color-base-100))] p-3 text-sm ring-1 ring-[color-mix(in_oklch,var(--color-success)_25%,transparent)]"
          data-test="resume-ai-cover-letter-card"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
              <Mail className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {saved.coverLetter.title || "Untitled cover letter"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {saved.created ? "Cover letter drafted" : "Cover letter updated"} ·{" "}
                {saved.coverLetter.wordCount} words
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg"
                onClick={() => focusCoverLetter(saved.coverLetter.id, "always")}
                data-test="resume-ai-cover-letter-preview"
              >
                <Eye className="size-3.5" />
                Preview
              </Button>
              <Button asChild size="sm" className="h-8 gap-1.5 rounded-lg">
                <Link
                  to="/cover-letters/$coverLetterId"
                  params={{ coverLetterId: saved.coverLetter.id }}
                  data-test="resume-ai-cover-letter-edit"
                >
                  Edit
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
