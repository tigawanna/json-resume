import { Badge } from "@/components/ui/badge";
import type { HistoryEvent } from "@/data-access-layer/event-sourced/event-history";
import { formatLocaleDateTime } from "@/utils/date-helpers";
import { History } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import {
  changedFields,
  collectionLabel,
  eventStatus,
  summaryOf,
  TYPE_STYLES,
} from "../../-components/event-labels";

interface ResumeEventRowProps {
  event: HistoryEvent;
  /** Older than the retention window and replaced by a later event for the same row. */
  squashable: boolean;
  /** Would be rolled back by the restore being confirmed. */
  undoing: boolean;
  isLatest: boolean;
  onRestore: (event: HistoryEvent) => void;
}

export function ResumeEventRow({
  event,
  squashable,
  undoing,
  isLatest,
  onRestore,
}: ResumeEventRowProps) {
  const [open, setOpen] = useState(false);
  const summary = summaryOf(event.payload);
  const changed = changedFields(event);

  return (
    <li
      className={twMerge(
        "border-b border-base-300 last:border-b-0",
        undoing && "bg-error/5",
        squashable && "opacity-60",
      )}
      data-test="resume-event-row"
      data-squashable={squashable || undefined}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 flex-col gap-1 text-left text-sm"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span className="flex flex-wrap items-center gap-2">
            <Badge className={TYPE_STYLES[event.type]}>{event.type}</Badge>
            <span className="font-medium">{collectionLabel(event.collectionId)}</span>
            {squashable ? (
              <Badge variant="outline" className="text-[10px]">
                squashable
              </Badge>
            ) : null}
            {undoing ? (
              <Badge variant="outline" className="border-error/40 text-[10px] text-error">
                will be undone
              </Badge>
            ) : null}
          </span>
          {summary ? <span className="truncate text-base-content/80">{summary}</span> : null}
          {changed.length > 0 ? (
            <span className="truncate text-xs text-base-content/60">
              Changed {changed.join(", ")}
            </span>
          ) : null}
          <span className="text-xs text-base-content/50">
            {formatLocaleDateTime(event.timestamp)} · {eventStatus(event)}
          </span>
        </button>
        {isLatest ? null : (
          <button
            type="button"
            className="btn btn-ghost btn-xs shrink-0 gap-1"
            onClick={() => onRestore(event)}
            title="Undo every change after this one"
            data-test="resume-event-restore"
          >
            <History className="size-3.5" />
            Restore to here
          </button>
        )}
      </div>
      {open ? (
        <div className="grid gap-2 bg-base-200 px-3 py-2 md:grid-cols-2">
          {event.previous ? <PayloadBlock label="Before" value={event.previous} /> : null}
          <PayloadBlock
            label={event.type === "delete" ? "Deleted row" : "After"}
            value={event.payload}
          />
        </div>
      ) : null}
    </li>
  );
}

function PayloadBlock({ label, value }: { label: string; value: Record<string, unknown> }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium text-base-content/60">{label}</span>
      <pre className="max-h-60 overflow-auto rounded bg-base-100 p-2 font-mono text-[11px] leading-snug">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
