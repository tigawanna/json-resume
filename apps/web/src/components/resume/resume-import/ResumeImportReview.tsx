import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  chosenAction,
  summarizeImport,
  type ImportChoices,
  type ResumeImportPlan,
} from "@/modules/resume-import/plan-resume-import";
import type { FieldKind, ImportAction, ImportEntry } from "@/modules/resume-import/reconcile";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

const ACTION_LABELS: Record<ImportAction, string> = {
  create: "Add as new",
  link: "Use existing",
  update: "Update library",
  keep: "Keep library version",
};

const KIND_HINTS: Record<FieldKind, string> = {
  identity: "name",
  fact: "fact",
  wording: "wording",
};

function isImportAction(value: string): value is ImportAction {
  return value in ACTION_LABELS;
}

function needsChoice(entry: ImportEntry) {
  return entry.actions.length > 1;
}

function MatchBadges({ entry }: { entry: ImportEntry }) {
  const { match } = entry;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {!match ? <Badge variant="secondary">New</Badge> : null}
      {match?.earlierEntry ? <Badge variant="outline">Same as an item above</Badge> : null}
      {match && !match.earlierEntry && match.exact ? (
        <Badge variant="outline">In your library</Badge>
      ) : null}
      {match && !match.earlierEntry && !match.exact ? (
        <Badge variant="outline">Close match {Math.round(match.score * 100)}%</Badge>
      ) : null}
      {entry.usedElsewhere > 0 ? (
        <Badge variant="ghost" className="text-muted-foreground">
          Used by {entry.usedElsewhere} other résumé{entry.usedElsewhere === 1 ? "" : "s"}
        </Badge>
      ) : null}
    </div>
  );
}

function EntryRow({
  entry,
  action,
  onChoose,
}: {
  entry: ImportEntry;
  action: ImportAction;
  onChoose: (action: ImportAction) => void;
}) {
  const { match } = entry;
  const showsLibraryLabel = match && !match.exact && match.label !== entry.label;
  return (
    <li
      className="border-border/60 flex flex-col gap-2 rounded-md border p-3"
      data-test="resume-import-entry"
      data-entry={entry.key}
      data-action={action}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{entry.label || "(untitled)"}</p>
          {showsLibraryLabel ? (
            <p className="text-muted-foreground truncate text-xs">Library: {match.label}</p>
          ) : null}
        </div>
        <MatchBadges entry={entry} />
      </div>

      {entry.changes.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs">
          {entry.changes.map((change) => (
            <li key={change.field} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-muted-foreground w-24 shrink-0">
                {change.label}
                <span className="opacity-60"> · {KIND_HINTS[change.kind]}</span>
              </span>
              <span className="line-through opacity-60">{change.from || "(empty)"}</span>
              <ArrowRight className="size-3 shrink-0 self-center" aria-hidden />
              <span>{change.to}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {entry.details.length > 0 ? (
        <p className="text-muted-foreground text-xs">{entry.details.join(" · ")}</p>
      ) : null}

      {needsChoice(entry) ? (
        <div className="flex flex-col gap-1">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={action}
            onValueChange={(value) => {
              if (isImportAction(value)) onChoose(value);
            }}
            aria-label={`What to do with ${entry.label}`}
            data-test="resume-import-entry-action"
          >
            {entry.actions.map((option) => (
              <ToggleGroupItem key={option} value={option} className="text-xs">
                {ACTION_LABELS[option]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {action === "update" && entry.usedElsewhere > 0 ? (
            <p className="text-warning text-xs">
              Also changes {entry.usedElsewhere} other résumé
              {entry.usedElsewhere === 1 ? "" : "s"}.
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

interface ResumeImportReviewProps {
  plan: ResumeImportPlan | null;
  isApplying: boolean;
  onCancel: () => void;
  onApply: (choices: ImportChoices) => void;
}

/**
 * Shows how an imported document maps onto the library — new rows, reused
 * rows, close matches and field changes — and lets the user pick per item.
 */
export function ResumeImportReview({
  plan,
  isApplying,
  onCancel,
  onApply,
}: ResumeImportReviewProps) {
  const [choices, setChoices] = useState<Map<string, ImportAction>>(new Map());
  const [showUnchanged, setShowUnchanged] = useState(false);

  const summary = plan ? summarizeImport(plan, choices) : null;

  function choose(key: string, action: ImportAction) {
    setChoices((current) => new Map(current).set(key, action));
  }

  return (
    <Dialog
      open={plan !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] flex-col sm:max-w-2xl"
        data-test="resume-import-review"
      >
        <DialogHeader>
          <DialogTitle>Review import</DialogTitle>
          <DialogDescription>
            Items that match your library are reused instead of duplicated. Check the ones that
            differ and choose whether to update the library or keep what is there.
          </DialogDescription>
        </DialogHeader>

        {plan && summary ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p data-test="resume-import-summary">
                <span className="font-medium">{summary.created}</span> new ·{" "}
                <span className="font-medium">{summary.updated}</span> updated ·{" "}
                <span className="font-medium">{summary.reused}</span> reused
                {summary.needsReview > 0 ? (
                  <span className="text-muted-foreground"> · {summary.needsReview} to review</span>
                ) : null}
              </p>
              <div className="flex items-center gap-2">
                <Switch
                  id="resume-import-show-unchanged"
                  checked={showUnchanged}
                  onCheckedChange={setShowUnchanged}
                />
                <Label htmlFor="resume-import-show-unchanged" className="text-xs">
                  Show unchanged items
                </Label>
              </div>
            </div>

            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              <div className="flex flex-col gap-5">
                {plan.groups.map((group) => {
                  const visible = group.entries.filter(
                    (entry) =>
                      showUnchanged || needsChoice(entry) || entry.defaultAction !== "link",
                  );
                  if (visible.length === 0) return null;
                  return (
                    <section key={group.section} className="flex flex-col gap-2">
                      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        {group.title}
                      </h3>
                      <ul className="flex flex-col gap-2">
                        {visible.map((entry) => (
                          <EntryRow
                            key={entry.key}
                            entry={entry}
                            action={chosenAction(entry, choices)}
                            onChoose={(action) => choose(entry.key, action)}
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })}
                {!showUnchanged &&
                plan.groups.every((group) =>
                  group.entries.every(
                    (entry) => !needsChoice(entry) && entry.defaultAction === "link",
                  ),
                ) ? (
                  <p className="text-muted-foreground text-sm">
                    Everything already matches your library.
                  </p>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onApply(choices)}
            disabled={isApplying}
            className={twMerge(isApplying && "opacity-80")}
            data-test="resume-import-apply"
          >
            {isApplying ? "Applying…" : "Apply import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
