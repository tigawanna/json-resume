import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  answerPlaceholders,
  answerWordCount,
  deleteApplicationAnswer,
  updateApplicationAnswer,
} from "@/data-access-layer/event-sourced/application-answer-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { ApplicationAnswer } from "@/data-access-layer/event-sourced/schemas";
import { unwrapUnknownError } from "@/utils/errors";
import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CopyTextButton } from "./CopyTextButton";

const SAVE_DELAY_MS = 600;

/**
 * Local text that saves shortly after typing stops, on blur, and on unmount.
 * Changes from elsewhere (the assistant, another tab) replace it only when nothing is pending.
 */
function useAutosavedText(stored: string, persist: (value: string) => string) {
  const [value, setValue] = useState(stored);
  const syncedRef = useRef(stored);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const persistRef = useRef(persist);

  useEffect(() => {
    persistRef.current = persist;
  });

  function flush() {
    window.clearTimeout(timerRef.current);
    const next = pendingRef.current;
    if (next === null) return;
    pendingRef.current = null;
    if (next.trim() === syncedRef.current) return;
    try {
      syncedRef.current = persistRef.current(next);
    } catch (err: unknown) {
      toast.error("Failed to save", { description: unwrapUnknownError(err).message });
    }
  }

  function change(next: string) {
    setValue(next);
    pendingRef.current = next;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(flush, SAVE_DELAY_MS);
  }

  useEffect(() => () => flush(), []);

  useEffect(() => {
    if (pendingRef.current !== null || stored === syncedRef.current) return;
    syncedRef.current = stored;
    setValue(stored);
  }, [stored]);

  return { value, change, flush };
}

function AnswerStats({ answer }: { answer: string }) {
  const gaps = answerPlaceholders(answer).length;
  return (
    <span className="text-muted-foreground flex items-center gap-2 text-xs">
      <span className="tabular-nums">{answerWordCount(answer)} words</span>
      {gaps > 0 ? (
        <Badge variant="outline" className="border-warning/50 text-warning text-[10px]">
          {gaps} to fill in
        </Badge>
      ) : null}
    </span>
  );
}

interface ApplicationAnswerEditorProps {
  row: ApplicationAnswer;
  /** Position on the form, shown before the question. */
  number?: number;
}

/** Question and answer fields that autosave as you type, with a copy button for the answer. */
export function ApplicationAnswerEditor({ row, number }: ApplicationAnswerEditorProps) {
  const db = useEventSourcedDb();
  const exists = () => db.collections.applicationAnswer.has(row.id);
  const question = useAutosavedText(row.question, (value) =>
    exists() ? updateApplicationAnswer(db, row.id, { question: value }).question : value,
  );
  const answer = useAutosavedText(row.answer, (value) =>
    exists() ? updateApplicationAnswer(db, row.id, { answer: value }).answer : value,
  );

  function handleDelete() {
    try {
      deleteApplicationAnswer(db, row.id);
      toast.success("Question deleted");
    } catch (err: unknown) {
      toast.error("Failed to delete", { description: unwrapUnknownError(err).message });
    }
  }

  return (
    <article
      className="bg-base-100 flex flex-col gap-2 rounded-lg border border-border p-3"
      data-test={`application-answer-${row.id}`}
    >
      <div className="flex items-center gap-2">
        {number === undefined ? null : (
          <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums">
            Q{number}
          </span>
        )}
        <Input
          value={question.value}
          onChange={(event) => question.change(event.target.value)}
          onBlur={question.flush}
          placeholder="The question, as the form asks it"
          aria-label="Question"
          className="font-semibold"
          data-test="application-answer-question"
        />
      </div>
      <Textarea
        value={answer.value}
        onChange={(event) => answer.change(event.target.value)}
        onBlur={answer.flush}
        placeholder="Your answer. Replace any [[...]] with the real detail before you paste it."
        aria-label="Answer"
        className="min-h-28 leading-6"
        data-test="application-answer-answer"
      />
      <div className="flex items-center justify-between gap-2">
        <AnswerStats answer={answer.value} />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete question"
            data-test="application-answer-delete"
          >
            <Trash2 className="size-4" />
          </Button>
          <CopyTextButton
            text={answer.value}
            label="Copy answer"
            copiedMessage="Answer copied"
            dataTest="application-answer-copy"
          />
        </div>
      </div>
    </article>
  );
}
