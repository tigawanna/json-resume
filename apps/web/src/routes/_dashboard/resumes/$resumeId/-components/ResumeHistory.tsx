import { Badge } from "@/components/ui/badge";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import {
  mergeEventHistory,
  resumeEventHistory,
} from "@/data-access-layer/event-sourced/event-history";
import { formatLocaleDateTime } from "@/utils/date-helpers";
import { useLiveQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useState } from "react";
import { collectionLabel, eventStatus, summaryOf, TYPE_STYLES } from "./event-labels";

const SHOWN = 20;

/**
 * This résumé's latest local events: the résumé row, rows scoped to it (sections,
 * links), and edits to the library entries it uses. The full view lives on the
 * résumé's events page.
 */
export function ResumeHistory({
  db,
  resumeId,
  onOpenFull,
}: {
  db: AppDb;
  resumeId: string;
  onOpenFull?: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: outbox } = useLiveQuery((q) => q.from({ row: db.collections.outbox }), []);
  const { data: inbox } = useLiveQuery((q) => q.from({ row: db.collections.inbox }), []);
  const events = resumeEventHistory(db, mergeEventHistory(outbox ?? [], inbox ?? []), resumeId);

  const fullLink = (
    <Link
      to="/resumes/$resumeId/events"
      params={{ resumeId }}
      onClick={onOpenFull}
      className="btn btn-outline btn-sm w-full justify-start gap-2"
      data-test="resume-history-open-full"
    >
      <History className="size-4" />
      Full history, squash & restore
    </Link>
  );

  if (events.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-base-content/60" data-test="resume-history-empty">
          No recorded changes on this device yet.
        </p>
        {fullLink}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-test="resume-history">
      <ol className="flex max-h-80 flex-col overflow-y-auto rounded-lg border border-base-300">
        {events.slice(0, SHOWN).map((event) => {
          const summary = summaryOf(event.payload);
          const open = expanded === event.id;
          return (
            <li
              key={event.id}
              className="border-b border-base-300 last:border-b-0"
              data-test="resume-history-event"
            >
              <button
                type="button"
                className="flex w-full flex-col gap-1 px-3 py-2 text-left text-xs hover:bg-base-200"
                onClick={() => setExpanded(open ? null : event.id)}
                aria-expanded={open}
              >
                <span className="flex items-center gap-2">
                  <Badge className={TYPE_STYLES[event.type]}>{event.type}</Badge>
                  <span className="font-medium">{collectionLabel(event.collectionId)}</span>
                  <span className="ml-auto text-base-content/50">{eventStatus(event)}</span>
                </span>
                {summary ? <span className="truncate text-base-content/80">{summary}</span> : null}
                <span className="text-base-content/50">
                  {formatLocaleDateTime(event.timestamp)}
                </span>
              </button>
              {open ? (
                <pre className="max-h-60 overflow-auto bg-base-200 px-3 py-2 font-mono text-[11px] leading-snug">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="text-[11px] text-base-content/50">
        {events.length > SHOWN
          ? `Latest ${SHOWN} of ${events.length.toLocaleString()} events on this device.`
          : `${events.length.toLocaleString()} events on this device.`}
      </p>
      {fullLink}
    </div>
  );
}
