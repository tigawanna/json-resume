import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { restoreToEvent, type HistoryEvent } from "@/data-access-layer/event-sourced/event-history";
import { planRestore } from "@/modules/sync/squash-plan";
import { formatLocaleDateTime } from "@/utils/date-helpers";
import { unwrapUnknownError } from "@/utils/errors";
import { toast } from "sonner";
import { collectionLabel } from "../../-components/event-labels";

interface RestoreEventDialogProps {
  db: AppDb;
  resumeId: string;
  events: readonly HistoryEvent[];
  target: HistoryEvent | null;
  onClose: () => void;
}

export function RestoreEventDialog({
  db,
  resumeId,
  events,
  target,
  onClose,
}: RestoreEventDialogProps) {
  const plan = target ? planRestore(events, target.id) : { steps: [], unknown: [] };
  const undone = target ? events.filter((event) => event.order > target.order).length : 0;
  const removed = plan.steps.filter((step) => step.kind === "remove").length;
  const scoped = new Set(
    events
      .filter((event) => event.collectionId === "resume" || event.payload.resumeId === resumeId)
      .map((event) => `${event.collectionId}\u0000${event.key}`),
  );
  const shared = plan.steps.filter((step) => !scoped.has(`${step.collectionId}\u0000${step.key}`));

  function handleRestore() {
    if (!target) return;
    try {
      const result = restoreToEvent(db, events, target.id);
      toast.success(`Restored ${result.applied.toLocaleString()} rows`, {
        description:
          result.unknown.length > 0
            ? `${result.unknown.length.toLocaleString()} rows had no earlier state on this device and were left as they are.`
            : undefined,
      });
      onClose();
    } catch (err: unknown) {
      toast.error("Restore failed", { description: unwrapUnknownError(err).message });
    }
  }

  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <AlertDialogContent data-test="restore-event-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Restore to this point?</AlertDialogTitle>
          <AlertDialogDescription>
            {target
              ? `Undoes the ${undone.toLocaleString()} changes made after ${collectionLabel(target.collectionId).toLowerCase()} · ${formatLocaleDateTime(target.timestamp)}.`
              : null}{" "}
            The undo is saved as new changes, so it syncs to your other devices and can itself be
            restored past.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="flex flex-col gap-1 text-sm" data-test="restore-event-summary">
          <li>
            {plan.steps.length === 1
              ? "1 row changes"
              : `${plan.steps.length.toLocaleString()} rows change`}
            {removed > 0 ? `, ${removed.toLocaleString()} of them removed` : ""}.
          </li>
          {shared.length > 0 ? (
            <li className="text-warning">
              {shared.length === 1
                ? "1 is a library entry shared with your other résumés; it changes there too."
                : `${shared.length.toLocaleString()} are library entries shared with your other résumés; they change there too.`}
            </li>
          ) : null}
          {plan.unknown.length > 0 ? (
            <li className="text-base-content/60">
              {plan.unknown.length.toLocaleString()} rows have no earlier state left on this device
              and stay as they are.
            </li>
          ) : null}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={plan.steps.length === 0}
            onClick={handleRestore}
            data-test="restore-event-confirm"
          >
            Restore
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
