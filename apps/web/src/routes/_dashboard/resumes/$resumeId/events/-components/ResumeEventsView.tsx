import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  mergeEventHistory,
  resumeEventHistory,
  squashLocalEvents,
  type HistoryEvent,
} from "@/data-access-layer/event-sourced/event-history";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { planSquash } from "@/modules/sync/squash-plan";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Layers } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ResumeEventRow } from "./ResumeEventRow";
import { RestoreEventDialog } from "./RestoreEventDialog";

const HOUR = 60 * 60 * 1000;
const RETENTION = { day: 24 * HOUR, hour: HOUR, none: 0 } as const;
type Retention = keyof typeof RETENTION;
const RETENTION_OPTIONS = ["day", "hour", "none"] as const satisfies readonly Retention[];
const RETENTION_LABELS: Record<Retention, string> = {
  day: "Keep the last 24 hours",
  hour: "Keep the last hour",
  none: "Keep only each row's latest event",
};
const PAGE = 100;

function isRetention(value: string): value is Retention {
  return value in RETENTION;
}

export function ResumeEventsView({ resumeId }: { resumeId: string }) {
  const db = useEventSourcedDb();
  const [now] = useState(() => Date.now());
  const [retention, setRetention] = useState<Retention>("day");
  const [shown, setShown] = useState(PAGE);
  const [restoreTarget, setRestoreTarget] = useState<HistoryEvent | null>(null);

  const { data: resumeRows } = useLiveQuery(
    (q) => q.from({ row: db.collections.resume }).where(({ row }) => eq(row.id, resumeId)),
    [resumeId],
  );
  const { data: outbox } = useLiveQuery((q) => q.from({ row: db.collections.outbox }), []);
  const { data: inbox } = useLiveQuery((q) => q.from({ row: db.collections.inbox }), []);
  const events = resumeEventHistory(db, mergeEventHistory(outbox ?? [], inbox ?? []), resumeId);
  const title = resumeRows?.[0]?.name ?? "Résumé";

  const preview = planSquash(events, { before: now - RETENTION[retention] });
  const squashable = new Set(preview.remove.map((event) => event.id));
  const pending = events.filter((event) => event.origin === "local" && !event.synced).length;

  const squash = useMutation({
    mutationFn: async () => squashLocalEvents(db, events, Date.now() - RETENTION[retention]),
    onSuccess(plan) {
      toast.success(`Squashed ${plan.remove.length.toLocaleString()} events on this device`, {
        description: `${plan.reasons.superseded.toLocaleString()} replaced by a later edit · ${plan.reasons.deleted.toLocaleString()} history of deleted rows`,
      });
    },
    onError(err: unknown) {
      toast.error("Squash failed", { description: unwrapUnknownError(err).message });
    },
  });

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6"
      data-test="resume-events-view"
    >
      <header className="flex flex-col gap-1">
        <Link
          to="/resumes/$resumeId"
          params={{ resumeId }}
          search={{ tab: "edit" }}
          className="btn btn-ghost btn-sm w-fit gap-2 px-2"
          data-test="resume-events-back"
        >
          <ArrowLeft className="size-4" />
          Back to résumé
        </Link>
        <h1 className="text-2xl font-semibold">History of “{title}”</h1>
        <p className="text-sm text-base-content/60">
          Every change on this device to the résumé, the rows scoped to it, and the library entries
          it uses. Newest first.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex min-w-0 flex-col gap-2" data-test="resume-events-timeline">
          {events.length === 0 ? (
            <p className="rounded-lg border border-base-300 p-6 text-sm text-base-content/60">
              No recorded changes on this device yet.
            </p>
          ) : (
            <ol className="flex flex-col rounded-lg border border-base-300 bg-base-100">
              {events.slice(0, shown).map((event, index) => (
                <ResumeEventRow
                  key={event.id}
                  event={event}
                  isLatest={index === 0}
                  squashable={squashable.has(event.id)}
                  undoing={restoreTarget !== null && event.order > restoreTarget.order}
                  onRestore={setRestoreTarget}
                />
              ))}
            </ol>
          )}
          {events.length > shown ? (
            <button
              type="button"
              className="btn btn-outline btn-sm self-center"
              onClick={() => setShown((value) => value + PAGE)}
              data-test="resume-events-more"
            >
              Show {Math.min(PAGE, events.length - shown).toLocaleString()} more of{" "}
              {(events.length - shown).toLocaleString()}
            </button>
          ) : null}
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <Card data-test="resume-events-stats">
            <CardHeader>
              <CardTitle className="text-base">On this device</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Events" value={events.length} />
              <Stat label="Not pushed yet" value={pending} />
            </CardContent>
          </Card>

          <Card data-test="resume-events-squash">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="size-4" /> Squash
              </CardTitle>
              <CardDescription>
                Each row keeps its latest event: the full row, or the delete that removed it. Older
                events it replaced are dropped. Restore can only reach back to what is kept.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <RadioGroup
                value={retention}
                onValueChange={(value) => {
                  if (isRetention(value)) setRetention(value);
                }}
                className="flex flex-col gap-2"
              >
                {RETENTION_OPTIONS.map((option) => (
                  <Label key={option} className="flex items-center gap-2 font-normal">
                    <RadioGroupItem
                      value={option}
                      data-test={`resume-events-retention-${option}`}
                    />
                    {RETENTION_LABELS[option]}
                  </Label>
                ))}
              </RadioGroup>
              <p className="text-sm" data-test="resume-events-squash-preview">
                {preview.remove.length === 0
                  ? "Nothing to squash."
                  : `${preview.remove.length.toLocaleString()} events can go: ${preview.reasons.superseded.toLocaleString()} replaced by a later edit, ${preview.reasons.deleted.toLocaleString()} history of deleted rows.`}
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={preview.remove.length === 0 || squash.isPending}
                onClick={() => squash.mutate()}
                data-test="resume-events-squash-submit"
              >
                {squash.isPending ? "Squashing…" : "Squash on this device"}
              </button>
              <p className="text-xs text-base-content/50">
                Unpushed changes are never squashed. The server copy is squashed nightly, keeping
                the last 24 hours.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xl font-semibold tabular-nums">{value.toLocaleString()}</span>
      <span className="text-xs text-base-content/60">{label}</span>
    </div>
  );
}
