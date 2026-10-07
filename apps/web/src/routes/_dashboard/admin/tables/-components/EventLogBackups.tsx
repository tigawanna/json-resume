import { Input } from "@/components/ui/input";
import { dropEventLogBackupFn, restoreEventLogBackupFn } from "@/modules/admin/admin.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

type Backup = { table: string; rows: number; createdAt: number };

export function EventLogBackups({ backups }: { backups: Backup[] }) {
  return (
    <div className="flex flex-col gap-2" data-test="event-log-backups">
      <p className="text-xs font-medium text-base-content/70">Backups</p>
      {backups.length === 0 ? (
        <p className="text-xs text-base-content/50">None yet. One is made on every truncate.</p>
      ) : (
        <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
          {backups.map((backup) => (
            <BackupRow key={backup.table} backup={backup} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BackupRow({ backup }: { backup: Backup }) {
  const [dropping, setDropping] = useState(false);
  const [confirm, setConfirm] = useState("");

  const restore = useMutation({
    mutationFn: async () => restoreEventLogBackupFn({ data: { table: backup.table } }),
    onSuccess(result) {
      toast.success(`Restored ${result.restored.toLocaleString()} events from ${backup.table}`);
    },
    onError(err: unknown) {
      toast.error("Restore failed", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [["admin"]] },
  });

  const drop = useMutation({
    mutationFn: async () => dropEventLogBackupFn({ data: { table: backup.table, confirm } }),
    onSuccess() {
      toast.success(`Dropped ${backup.table}`);
    },
    onError(err: unknown) {
      toast.error("Drop failed", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [["admin"]] },
  });

  const busy = restore.isPending || drop.isPending;

  return (
    <li
      className="flex flex-col gap-2 rounded-lg border border-base-300 p-2 text-xs"
      data-test="event-log-backup"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <Link
            to="/admin/tables/$table"
            params={{ table: backup.table }}
            search={{ page: 0 }}
            className="truncate font-mono hover:underline"
          >
            {backup.table}
          </Link>
          <span className="text-base-content/60">
            {new Date(backup.createdAt).toLocaleString()} · {backup.rows.toLocaleString()} events
          </span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="btn btn-outline btn-xs"
            disabled={busy}
            onClick={() => restore.mutate()}
            data-test="event-log-backup-restore"
          >
            {restore.isPending ? "Restoring…" : "Restore"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs text-error"
            disabled={busy}
            onClick={() => setDropping((value) => !value)}
            data-test="event-log-backup-drop-toggle"
          >
            Drop
          </button>
        </div>
      </div>
      {dropping ? (
        <div className="flex items-center gap-2">
          <Input
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder={`Type ${backup.table}`}
            autoComplete="off"
            className="h-8 font-mono text-xs"
            data-test="event-log-backup-drop-input"
          />
          <button
            type="button"
            className="btn btn-error btn-xs"
            disabled={busy || confirm !== backup.table}
            onClick={() => drop.mutate()}
            data-test="event-log-backup-drop-submit"
          >
            {drop.isPending ? "Dropping…" : "Drop table"}
          </button>
        </div>
      ) : null}
    </li>
  );
}
