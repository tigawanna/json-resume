import { PromptArea } from "@/components/prompt-area/prompt-area";
import { plainTextToSegments, segmentsToPlainText } from "@/components/prompt-area/segment-helpers";
import type { Segment } from "@/components/prompt-area/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  coverLetterWordCount,
  deleteCoverLetter,
  updateCoverLetter,
} from "@/data-access-layer/event-sourced/cover-letter-rows";
import { jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { CoverLetter } from "@/data-access-layer/event-sourced/schemas";
import { CoverLetterActions } from "@/features/cover-letter/CoverLetterActions";
import { CoverLetterPaper } from "@/features/cover-letter/CoverLetterPaper";
import { unwrapUnknownError } from "@/utils/errors";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Briefcase, FileText, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const SAVE_DELAY_MS = 700;

export function CoverLetterEditor({ letter }: { letter: CoverLetter }) {
  const db = useEventSourcedDb();
  const navigate = useNavigate();
  const [title, setTitle] = useState(letter.title);
  const [segments, setSegments] = useState<Segment[]>(() => plainTextToSegments(letter.body));
  const draftBody = segmentsToPlainText(segments);
  /** Body the editor last wrote or loaded; anything else arriving is an outside edit. */
  const syncedBodyRef = useRef(letter.body);
  const pendingBodyRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | undefined>(undefined);

  function flushBody() {
    window.clearTimeout(saveTimerRef.current);
    const body = pendingBodyRef.current;
    if (body === null) return;
    pendingBodyRef.current = null;
    try {
      syncedBodyRef.current = updateCoverLetter(db, letter.id, { body }).body;
    } catch (err: unknown) {
      toast.error("Failed to save cover letter", {
        description: unwrapUnknownError(err).message,
      });
    }
  }

  function handleBodyChange(next: Segment[]) {
    setSegments(next);
    pendingBodyRef.current = segmentsToPlainText(next);
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(flushBody, SAVE_DELAY_MS);
  }

  useEffect(() => () => flushBody(), []);

  useEffect(() => {
    if (pendingBodyRef.current !== null || letter.body === syncedBodyRef.current) return;
    syncedBodyRef.current = letter.body;
    setSegments(plainTextToSegments(letter.body));
  }, [letter.body]);

  useEffect(() => {
    setTitle(letter.title);
  }, [letter.title]);

  function saveTitle() {
    if (title.trim() === letter.title) return;
    try {
      updateCoverLetter(db, letter.id, { title: title.trim() || "Untitled cover letter" });
    } catch (err: unknown) {
      toast.error("Failed to rename", { description: unwrapUnknownError(err).message });
    }
  }

  function handleDelete() {
    try {
      pendingBodyRef.current = null;
      deleteCoverLetter(db, letter.id);
      toast.success("Cover letter deleted");
      void navigate({ to: "/cover-letters" });
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  const resume = letter.resumeId ? db.collections.resume.get(letter.resumeId) : undefined;
  const job = letter.jobId ? db.collections.job.get(letter.jobId) : undefined;

  return (
    <div className="flex flex-col gap-4" data-test="cover-letter-editor">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link to="/cover-letters" data-test="cover-letter-back">
            <ArrowLeft className="size-4" />
            Cover letters
          </Link>
        </Button>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            placeholder="Untitled cover letter"
            aria-label="Cover letter title"
            className="h-10 text-lg font-semibold md:flex-1"
            data-test="cover-letter-title"
          />
          <div className="flex items-center gap-1.5">
            <CoverLetterActions title={letter.title} body={draftBody} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  aria-label="Delete cover letter"
                  data-test="cover-letter-delete"
                >
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this cover letter?</AlertDialogTitle>
                  <AlertDialogDescription>
                    It is removed from every device that syncs this account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel size="sm" variant="outline">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction variant="destructive" size="sm" onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {resume ? (
            <Link
              to="/resumes/$resumeId"
              params={{ resumeId: resume.id }}
              search={{ tab: "ai" }}
              className="hover:text-base-content inline-flex items-center gap-1"
              data-test="cover-letter-resume-link"
            >
              <FileText className="size-3.5" />
              {resume.name}
            </Link>
          ) : null}
          {job ? (
            <span className="inline-flex items-center gap-1" data-test="cover-letter-job">
              <Briefcase className="size-3.5" />
              {jobListLabel(job)}
            </span>
          ) : null}
          <span className="tabular-nums">{coverLetterWordCount(draftBody)} words</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-2" aria-label="Edit cover letter">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Edit
          </h2>
          <div className="bg-base-100 rounded-lg border border-border p-4 focus-within:ring-2 focus-within:ring-primary/30">
            <PromptArea
              value={segments}
              onChange={handleBodyChange}
              placeholder="Dear hiring team, …"
              markdown
              markdownHeadings
              normalizeBullets={false}
              submitOnEnter={false}
              minHeight={480}
              spellCheck
              aria-label="Cover letter body"
              data-test-id="cover-letter-body"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Markdown works: **bold**, *italic*, and - lists. Saves as you type.
          </p>
        </section>
        <section className="flex min-w-0 flex-col gap-2" aria-label="Cover letter preview">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Preview
          </h2>
          <div className="bg-base-200/40 rounded-lg p-3">
            <CoverLetterPaper body={draftBody} className="sm:px-10 sm:py-12" />
          </div>
        </section>
      </div>
    </div>
  );
}
