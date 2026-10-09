import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useViewer } from "@/data-access-layer/auth/viewer";
import {
  importJobsFromResumeGroups,
  listJobImportGroups,
  type JobImportGroup,
} from "@/data-access-layer/event-sourced/job-rows";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { unwrapUnknownError } from "@/utils/errors";
import { useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { toast } from "sonner";

type Draft = {
  selected: boolean;
  company: string;
  title: string;
};

function draftsFromGroups(groups: ReadonlyArray<JobImportGroup>) {
  const next: Record<string, Draft> = {};
  for (const group of groups) {
    next[group.key] = {
      selected: true,
      company: group.suggestedCompany,
      title: "",
    };
  }
  return next;
}

interface JobImportFromResumesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobImportFromResumesDialog({
  open,
  onOpenChange,
}: JobImportFromResumesDialogProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const { data: resumeSnapshot } = useLiveQuery(
    (query) => query.from({ row: db.collections.resume }).select(({ row }) => ({ id: row.id })),
    [],
  );
  const { data: jobSnapshot } = useLiveQuery(
    (query) => query.from({ row: db.collections.job }).select(({ row }) => ({ id: row.id })),
    [],
  );
  const groups = listJobImportGroups(db);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => draftsFromGroups(groups));
  const [pending, setPending] = useState(false);

  const snapshotKey = `${resumeSnapshot?.length ?? 0}:${jobSnapshot?.length ?? 0}:${groups.length}`;
  const [syncedKey, setSyncedKey] = useState(snapshotKey);
  if (open && syncedKey !== snapshotKey) {
    setSyncedKey(snapshotKey);
    setDrafts(draftsFromGroups(groups));
  }

  function patchDraft(key: string, patch: Partial<Draft>) {
    setDrafts((current) => {
      const previous = current[key] ?? { selected: false, company: "", title: "" };
      return { ...current, [key]: { ...previous, ...patch } };
    });
  }

  function handleImport() {
    setPending(true);
    try {
      const latest = listJobImportGroups(db);
      const selections = latest.flatMap((group) => {
        const draft = drafts[group.key];
        if (!draft?.selected) return [];
        return [{ key: group.key, company: draft.company, title: draft.title }];
      });
      const stats = importJobsFromResumeGroups(db, viewer.user?.id, latest, selections);
      if (stats.created === 0 && stats.reused === 0 && stats.attached === 0) {
        toast.message("Nothing imported", {
          description: "Select at least one posting.",
        });
        return;
      }
      toast.success(`Imported ${stats.created} job${stats.created === 1 ? "" : "s"} from résumés`, {
        description: `${stats.attached} résumé${stats.attached === 1 ? "" : "s"} linked${
          stats.reused ? `, ${stats.reused} existing` : ""
        }${stats.skipped ? `, ${stats.skipped} skipped` : ""}.`,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error("Failed to import jobs", {
        description: unwrapUnknownError(err).message,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from résumés</DialogTitle>
          <DialogDescription>
            Unique job descriptions pasted on résumés that are not linked to a job yet. Duplicate
            text is grouped so one posting can attach to several résumés.
          </DialogDescription>
        </DialogHeader>
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No unlinked job descriptions found on your résumés.
          </p>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
            {groups.map((group) => {
              const draft = drafts[group.key] ?? {
                selected: false,
                company: group.suggestedCompany,
                title: "",
              };
              return (
                <li
                  key={group.key}
                  className="border-border bg-base-200/40 rounded-lg border p-3"
                  data-test="job-import-group"
                >
                  <label className="flex items-start gap-2">
                    <Checkbox
                      checked={draft.selected}
                      onCheckedChange={(checked) =>
                        patchDraft(group.key, { selected: checked === true })
                      }
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {group.resumeNames.join(", ")}
                      </span>
                      <span className="text-muted-foreground mt-1 line-clamp-3 block text-xs whitespace-pre-wrap">
                        {group.description}
                      </span>
                      {group.existingJobId ? (
                        <span className="text-muted-foreground mt-1 block text-xs">
                          Matches an existing job — will attach instead of duplicating.
                        </span>
                      ) : null}
                    </span>
                  </label>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Company</Label>
                      <Input
                        value={draft.company}
                        onChange={(e) => patchDraft(group.key, { company: e.target.value })}
                        className="mt-1"
                        placeholder="Optional"
                        data-test="job-import-company"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Role title</Label>
                      <Input
                        value={draft.title}
                        onChange={(e) => patchDraft(group.key, { title: e.target.value })}
                        className="mt-1"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={pending || groups.length === 0}
            data-test="job-import-confirm"
          >
            {pending ? "Importing…" : "Import selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
