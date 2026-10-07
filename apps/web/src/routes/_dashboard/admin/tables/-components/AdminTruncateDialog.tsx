import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminTruncatePreviewQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { truncateAdminTableFn } from "@/modules/admin/admin.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Eraser } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EventLogBackups } from "../../-components/EventLogBackups";

type Scope = "all" | "older";

export function AdminTruncateDialog({ table }: { table: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="btn btn-error btn-outline btn-sm h-9" data-test="admin-table-truncate">
          <Eraser className="size-4" /> Truncate
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" data-test="admin-truncate-dialog">
        {open ? <TruncateBody table={table} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function TruncateBody({ table, onDone }: { table: string; onDone: () => void }) {
  const [scope, setScope] = useState<Scope>("all");
  const [column, setColumn] = useState<string | null>(null);
  const [before, setBefore] = useState("");
  const [confirm, setConfirm] = useState("");
  const [rebuild, setRebuild] = useState(false);

  const base = useQuery(adminTruncatePreviewQueryOptions({ table }));
  const columns = base.data?.cutoffColumns ?? [];
  const activeColumn =
    column ?? (columns.includes("created_at") ? "created_at" : (columns[0] ?? null));
  const beforeMs = before ? new Date(before).getTime() : Number.NaN;
  const cutoff =
    scope === "older" && activeColumn && Number.isFinite(beforeMs)
      ? { column: activeColumn, before: beforeMs }
      : undefined;
  const scoped = useQuery({
    ...adminTruncatePreviewQueryOptions({ table, cutoff }),
    enabled: Boolean(cutoff),
    placeholderData: keepPreviousData,
  });
  const preview = scope === "all" ? base.data : cutoff ? scoped.data : undefined;
  const previewError = scope === "all" ? base.error : scoped.error;
  const isEventLog = base.data?.mode === "eventLog";

  const mutation = useMutation({
    mutationFn: async () =>
      truncateAdminTableFn({ data: { table, confirm, cutoff, rebuild: isEventLog && rebuild } }),
    onSuccess(result) {
      if (result.mode === "eventLog") {
        toast.success(`Emptied ${table}: ${result.deleted.toLocaleString()} events backed up`, {
          description: [
            `Backup: ${result.backup}`,
            result.events > 0
              ? `Rebuilt ${result.events.toLocaleString()} events for ${result.users.toLocaleString()} users.`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
        });
        onDone();
        return;
      }
      toast.success(`Deleted ${result.deleted.toLocaleString()} rows from ${table}`, {
        description:
          result.mode === "synced"
            ? `${result.references.toLocaleString()} reference rows went with them; ${result.events.toLocaleString()} delete events were written for devices.`
            : undefined,
      });
      onDone();
    },
    onError(err: unknown) {
      toast.error("Truncate failed", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [["admin"]] },
  });

  const blocked = (preview?.blockedBy.length ?? 0) > 0;
  const canSubmit =
    Boolean(preview) &&
    preview?.mode !== "readonly" &&
    (preview?.rows ?? 0) > 0 &&
    !blocked &&
    (scope === "all" || Boolean(cutoff)) &&
    confirm === table &&
    !mutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Truncate <span className="font-mono">{table}</span>
        </DialogTitle>
        <DialogDescription>
          {isEventLog
            ? "Copies every event into a new backup table, then empties the log. Restore the backup below if anything goes wrong."
            : "Deletes rows and keeps the table and its columns. This cannot be undone."}
        </DialogDescription>
      </DialogHeader>

      {base.data?.mode === "readonly" ? (
        <p className="text-sm text-error">This table is sync bookkeeping and is read-only.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {isEventLog ? null : (
            <RadioGroup
              value={scope}
              onValueChange={(value) => setScope(value === "older" ? "older" : "all")}
              className="flex flex-col gap-2"
            >
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="all" data-test="admin-truncate-scope-all" />
                All rows
              </Label>
              <Label
                className="flex items-center gap-2 font-normal"
                aria-disabled={columns.length === 0}
              >
                <RadioGroupItem
                  value="older"
                  disabled={columns.length === 0}
                  data-test="admin-truncate-scope-older"
                />
                Only rows older than a date
                {columns.length === 0 && base.data ? (
                  <span className="text-xs text-base-content/50">(no date columns)</span>
                ) : null}
              </Label>
            </RadioGroup>
          )}

          {scope === "older" && !isEventLog ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Column</Label>
                <Select value={activeColumn ?? undefined} onValueChange={setColumn}>
                  <SelectTrigger data-test="admin-truncate-column">
                    <SelectValue placeholder="Pick a column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((name) => (
                      <SelectItem key={name} value={name} className="font-mono">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Older than</Label>
                <Input
                  type="datetime-local"
                  value={before}
                  onChange={(event) => setBefore(event.target.value)}
                  data-test="admin-truncate-before"
                />
              </div>
            </div>
          ) : null}

          <div
            className="flex flex-col gap-1 rounded-lg border border-base-300 bg-base-200 p-3 text-sm"
            data-test="admin-truncate-preview"
          >
            {previewError ? (
              <p className="text-error">{previewError.message}</p>
            ) : scope === "older" && !cutoff ? (
              <p className="text-base-content/60">Pick a column and a date to see what matches.</p>
            ) : !preview ? (
              <p className="text-base-content/60">Counting rows…</p>
            ) : preview.mode === "eventLog" ? (
              <>
                <p>
                  <span className="font-semibold">{preview.rows.toLocaleString()}</span> events will
                  be copied to a new <span className="font-mono">sync_event_backup_…</span> table,
                  then deleted.
                </p>
                <p className="text-base-content/70">
                  Pending events are projected first, so the resume tables keep all data. Devices
                  keep their local copies; a device signing in fresh pulls nothing until the log is
                  rebuilt or restored.
                </p>
                <Label className="mt-1 flex items-start gap-2 font-normal">
                  <Checkbox
                    checked={rebuild}
                    onCheckedChange={(checked) => setRebuild(checked === true)}
                    className="mt-0.5"
                    data-test="admin-truncate-rebuild"
                  />
                  <span>
                    Then rebuild a minimal log: one insert per live row, per user.
                    {rebuild ? (
                      <span className="block text-warning">
                        Every device wipes its local copy and re-pulls on its next sync; push
                        pending changes first.
                      </span>
                    ) : null}
                  </span>
                </Label>
              </>
            ) : (
              <>
                <p>
                  <span className="font-semibold">{preview.rows.toLocaleString()}</span> row
                  {preview.rows === 1 ? "" : "s"} will be deleted.
                </p>
                {preview.mode === "synced" ? (
                  <p className="text-base-content/70">
                    Synced table: each row gets a delete event so it also disappears from its
                    owner's devices.
                  </p>
                ) : null}
                {preview.references.map((ref) => (
                  <p key={ref.table} className="text-base-content/70">
                    Plus {ref.rows.toLocaleString()} reference rows in{" "}
                    <span className="font-mono">{ref.table}</span>. Shared entities stay.
                  </p>
                ))}
                {preview.cascades.map((ref) => (
                  <p key={`${ref.table}.${ref.column}`} className="text-warning">
                    SQLite will also cascade to {ref.rows.toLocaleString()} rows in{" "}
                    <span className="font-mono">{ref.table}</span> ({ref.column}).
                  </p>
                ))}
                {preview.blockedBy.map((ref) => (
                  <p key={`${ref.table}.${ref.column}`} className="text-error">
                    Blocked: {ref.rows.toLocaleString()} synced rows in{" "}
                    <span className="font-mono">{ref.table}</span> still point here. Truncate that
                    table first.
                  </p>
                ))}
              </>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">
              Type <span className="font-mono">{table}</span> to confirm
            </Label>
            <Input
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="off"
              data-test="admin-truncate-confirm-input"
            />
          </div>

          {isEventLog && base.data ? <EventLogBackups backups={base.data.backups} /> : null}
        </div>
      )}

      <DialogFooter>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-error btn-sm"
          disabled={!canSubmit}
          onClick={() => mutation.mutate()}
          data-test="admin-truncate-submit"
        >
          {mutation.isPending ? "Deleting…" : isEventLog ? "Back up & empty" : "Delete rows"}
        </button>
      </DialogFooter>
    </>
  );
}
