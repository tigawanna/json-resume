import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { adminUsersQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { runManagedSync } from "@/data-access-layer/event-sourced/app-settings";
import { wipeLocalDatabase } from "@/data-access-layer/event-sourced/local-reset";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { rebuildAllEventLogsFn, rebuildEventLog } from "@/modules/admin/admin.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminActionCard } from "../../-components/AdminActionCard";
import { ALL_USERS, AdminUserSelect } from "../../-components/AdminUserSelect";

export function RebuildEventLogAction() {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const users = useQuery(adminUsersQueryOptions);
  const [userId, setUserId] = useState(viewer.user?.id ?? "");
  const isAll = userId === ALL_USERS;
  const includesSelf = isAll || userId === viewer.user?.id;
  const selected = users.data?.find((user) => user.id === userId);
  const events = isAll
    ? (users.data ?? []).reduce((sum, user) => sum + user.events, 0)
    : (selected?.events ?? 0);

  const mutation = useMutation({
    mutationFn: async () => {
      if (includesSelf) {
        await runManagedSync(db, "manual");
        const pending = db.getSyncStatus().pendingCount;
        if (pending > 0) {
          throw new Error(`${pending} local change(s) are not uploaded yet. Sync them first.`);
        }
      }
      if (isAll) {
        const result = await rebuildAllEventLogsFn();
        return { previousEvents: result.previousEvents, insertedEvents: result.insertedEvents };
      }
      return rebuildEventLog({ data: { userId } });
    },
    async onSuccess(result) {
      toast.success("Event log rebuilt", {
        description: `${result.previousEvents.toLocaleString()} old events replaced by ${result.insertedEvents.toLocaleString()}.`,
      });
      if (includesSelf) await wipeLocalDatabase({ resumeSync: true });
    },
    onError(err: unknown) {
      toast.error("Failed to rebuild event log", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [["admin"]],
    },
  });

  const who = isAll ? "every user" : `${selected?.name ?? "this user"}`;

  return (
    <AdminActionCard
      title="Rebuild event log"
      description="Replaces sync events with one insert per row currently in the tables. Affected devices drop local data and pull the rebuilt log on next sync."
      danger
      data-test="admin-rebuild-action"
    >
      <AdminUserSelect
        value={userId}
        onChange={setUserId}
        allowAll
        data-test="admin-rebuild-user"
      />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            className="btn btn-error btn-sm self-start"
            disabled={!userId || mutation.isPending}
            data-test="admin-rebuild-open"
          >
            {mutation.isPending ? "Rebuilding…" : "Reset & rebuild"}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rebuild the event log for {who}?</AlertDialogTitle>
            <AlertDialogDescription>
              All {events.toLocaleString()} sync events are deleted and regenerated from the current
              table rows. History is lost.
              {isAll ? " Events of users that no longer exist are dropped." : ""}
              {includesSelf ? " This tab will wipe its local copy and reload." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate()} data-test="admin-rebuild-confirm">
              Rebuild
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminActionCard>
  );
}
