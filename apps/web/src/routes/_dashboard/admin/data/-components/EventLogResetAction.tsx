import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminEventLogBackupsQueryOptions,
  adminStatsQueryOptions,
} from "@/data-access-layer/admin/admin-query-options";
import { backupAndEmptyEventLogFn } from "@/modules/admin/admin.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminActionCard } from "../../-components/AdminActionCard";
import { EventLogBackups } from "../../-components/EventLogBackups";

const EVENT_LOG_TABLE = "sync_event";

export function EventLogResetAction() {
  const [confirm, setConfirm] = useState("");
  const [rebuild, setRebuild] = useState(false);
  const stats = useQuery(adminStatsQueryOptions);
  const backups = useQuery(adminEventLogBackupsQueryOptions);
  const events = stats.data?.events ?? 0;

  const mutation = useMutation({
    mutationFn: async () => backupAndEmptyEventLogFn({ data: { confirm, rebuild } }),
    onSuccess(result) {
      toast.success(`Emptied the event log: ${result.deleted.toLocaleString()} events backed up`, {
        description: [
          `Backup: ${result.backup}`,
          result.rebuiltEvents > 0
            ? `Rebuilt ${result.rebuiltEvents.toLocaleString()} events for ${result.rebuiltUsers.toLocaleString()} users.`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
      setConfirm("");
      setRebuild(false);
    },
    onError(err: unknown) {
      toast.error("Could not empty the event log", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: { invalidates: [["admin"]] },
  });

  return (
    <AdminActionCard
      title="Back up & empty the event log"
      description={`Copies all ${events.toLocaleString()} events into a new sync_event_backup_… table, then deletes them from the log. Tables and devices keep their data; restore a backup below if anything goes wrong.`}
      danger
      data-test="admin-event-log-reset-action"
    >
      <Label className="flex items-start gap-2 font-normal">
        <Checkbox
          checked={rebuild}
          onCheckedChange={(value) => setRebuild(value === true)}
          data-test="admin-event-log-reset-rebuild"
        />
        <span className="flex flex-col gap-1">
          Then rebuild a minimal log from the tables
          {rebuild ? (
            <span className="text-xs text-warning">
              Every user gets a fresh backend id, so all their devices wipe local data and pull
              again.
            </span>
          ) : null}
        </span>
      </Label>
      <div className="flex items-center gap-2">
        <Input
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder={`Type ${EVENT_LOG_TABLE}`}
          autoComplete="off"
          className="h-8 font-mono text-xs"
          data-test="admin-event-log-reset-confirm"
        />
        <button
          type="button"
          className="btn btn-error btn-sm"
          disabled={confirm !== EVENT_LOG_TABLE || mutation.isPending}
          onClick={() => mutation.mutate()}
          data-test="admin-event-log-reset-submit"
        >
          {mutation.isPending ? "Working…" : "Back up & empty"}
        </button>
      </div>
      {backups.data ? (
        <EventLogBackups backups={backups.data} />
      ) : (
        <p className="text-xs text-base-content/50">
          {backups.error ? unwrapUnknownError(backups.error).message : "Loading backups…"}
        </p>
      )}
    </AdminActionCard>
  );
}
