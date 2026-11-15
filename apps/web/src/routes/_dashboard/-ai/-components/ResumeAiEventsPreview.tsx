import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  mergeEventHistory,
  resumeEventHistory,
  type HistoryEvent,
} from "@/data-access-layer/event-sourced/resume/event-history";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import {
  changedFields,
  collectionLabel,
  eventStatus,
  summaryOf,
  TYPE_STYLES,
} from "@/routes/_dashboard/resumes/$resumeId/-components/event-labels";
import { RestoreEventDialog } from "@/routes/_dashboard/resumes/$resumeId/events/-components/RestoreEventDialog";
import { formatLocaleDateTime } from "@/utils/date-helpers";
import { useLiveQuery } from "@tanstack/react-db";
import { History, Loader2 } from "lucide-react";
import { useState } from "react";

const PAGE = 40;

export function ResumeAiEventsPreview({ resumeId }: { resumeId: string }) {
  const db = useEventSourcedDb();
  const [shown, setShown] = useState(PAGE);
  const [restoreTarget, setRestoreTarget] = useState<HistoryEvent | null>(null);

  const { data: outbox, isLoading: outboxLoading } = useLiveQuery(
    (q) => q.from({ row: db.collections.outbox }),
    [],
  );
  const { data: inbox, isLoading: inboxLoading } = useLiveQuery(
    (q) => q.from({ row: db.collections.inbox }),
    [],
  );
  const events = resumeEventHistory(db, mergeEventHistory(outbox ?? [], inbox ?? []), resumeId);
  const loading = (outboxLoading || inboxLoading) && events.length === 0;

  if (loading) {
    return (
      <div className="text-base-content/60 flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-test="resume-ai-events">
      <p className="text-base-content/60 border-b border-border/60 px-3 py-2 text-xs">
        Changes to this résumé on this device, newest first. Undo rolls that change and everything
        newer back.
      </p>
      {events.length === 0 ? (
        <p
          className="text-base-content/60 flex flex-1 items-center justify-center p-6 text-center text-sm"
          data-test="resume-ai-events-empty"
        >
          No recorded changes for this résumé yet.
        </p>
      ) : (
        <ol className="min-h-0 flex-1 overflow-auto">
          {events.slice(0, shown).map((event, index) => (
            <EventRow
              key={event.id}
              event={event}
              undoTo={events[index + 1] ?? null}
              undoing={restoreTarget !== null && event.order > restoreTarget.order}
              onRestore={setRestoreTarget}
            />
          ))}
          {events.length > shown ? (
            <li className="flex justify-center py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShown((value) => value + PAGE)}
                data-test="resume-ai-events-more"
              >
                Show {Math.min(PAGE, events.length - shown)} more
              </Button>
            </li>
          ) : null}
        </ol>
      )}
      <RestoreEventDialog
        db={db}
        resumeId={resumeId}
        events={events}
        target={restoreTarget}
        onClose={() => setRestoreTarget(null)}
      />
    </div>
  );
}

function EventRow({
  event,
  undoTo,
  undoing,
  onRestore,
}: {
  event: HistoryEvent;
  /** The change to keep. Restoring to it undoes this event and every newer one. */
  undoTo: HistoryEvent | null;
  undoing: boolean;
  onRestore: (event: HistoryEvent) => void;
}) {
  const summary = summaryOf(event.payload);
  const changed = changedFields(event);

  return (
    <li
      className={`flex items-start gap-2 border-b border-border/40 px-3 py-2 ${undoing ? "bg-error/5" : ""}`}
      data-test="resume-ai-event-row"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge className={TYPE_STYLES[event.type]}>{event.type}</Badge>
          <span className="font-medium">{collectionLabel(event.collectionId)}</span>
          {undoing ? (
            <span className="text-error text-[10px] tracking-wide uppercase">Will undo</span>
          ) : null}
        </span>
        {summary ? <span className="truncate text-base-content/80">{summary}</span> : null}
        {changed.length > 0 ? (
          <span className="truncate text-xs text-base-content/60">Changed {changed.join(", ")}</span>
        ) : null}
        <span className="text-xs text-base-content/50">
          {formatLocaleDateTime(event.timestamp)} · {eventStatus(event)}
        </span>
      </div>
      {undoTo ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label="Undo this and newer"
              onClick={() => onRestore(undoTo)}
              data-test="resume-ai-event-restore"
            >
              <History className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo this and newer</TooltipContent>
        </Tooltip>
      ) : null}
    </li>
  );
}
