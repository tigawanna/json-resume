import { Button } from "@/components/ui/button";
import { latestCoverLetterForResume } from "@/data-access-layer/event-sourced/cover-letter-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { CoverLetterActions } from "@/features/cover-letter/CoverLetterActions";
import { CoverLetterPaper } from "@/features/cover-letter/CoverLetterPaper";
import { useLiveQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Mail } from "lucide-react";

interface ResumeAiCoverLetterPreviewProps {
  /** Letter the assistant or the user focused; falls back to the résumé's newest one. */
  coverLetterId: string | null;
  resumeId: string;
}

export function ResumeAiCoverLetterPreview({
  coverLetterId,
  resumeId,
}: ResumeAiCoverLetterPreviewProps) {
  const db = useEventSourcedDb();
  const { data: letters } = useLiveQuery((q) => q.from({ letter: db.collections.coverLetter }), []);
  const all = letters ?? [];
  const letter =
    (coverLetterId ? all.find((row) => row.id === coverLetterId) : undefined) ??
    latestCoverLetterForResume(all, resumeId);

  if (!letter) {
    return (
      <div
        className="text-base-content/60 flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm"
        data-test="resume-ai-cover-letter-empty"
      >
        <Mail className="size-6 opacity-60" />
        <p>No cover letter for this résumé yet.</p>
        <p className="text-xs">
          Cover letters are optional. Ask for one, or type <code>/cover-letter</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-test="resume-ai-cover-letter">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={letter.title}>
          {letter.title || "Untitled cover letter"}
        </span>
        <CoverLetterActions title={letter.title} body={letter.body} compact />
        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
          <Link
            to="/cover-letters/$coverLetterId"
            params={{ coverLetterId: letter.id }}
            data-test="resume-ai-cover-letter-open"
          >
            Edit
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-base-200/40 p-3">
        <CoverLetterPaper body={letter.body} className="px-6 py-8 text-sm leading-6 sm:px-10" />
      </div>
    </div>
  );
}
