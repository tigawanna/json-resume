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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { runManagedSync } from "@/data-access-layer/event-sourced/app-settings";
import { wipeLocalDatabase } from "@/data-access-layer/event-sourced/local-reset";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { rebuildEventLog } from "@/modules/admin/admin.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type RebuildEventLogActionProps = {
  users: { id: string; name: string; email: string; events: number }[];
};

export function RebuildEventLogAction({ users }: RebuildEventLogActionProps) {
  const db = useEventSourcedDb();
  const { viewer } = useViewer();
  const [userId, setUserId] = useState(viewer.user?.id ?? users[0]?.id ?? "");
  const isSelf = userId === viewer.user?.id;

  const mutation = useMutation({
    mutationFn: async () => {
      if (isSelf) {
        await runManagedSync(db, "manual");
        const pending = db.getSyncStatus().pendingCount;
        if (pending > 0) {
          throw new Error(`${pending} local change(s) are not uploaded yet. Sync them first.`);
        }
      }
      return rebuildEventLog({ data: { userId } });
    },
    async onSuccess(result) {
      toast.success("Event log rebuilt", {
        description: `${result.previousEvents} old events replaced by ${result.insertedEvents}.`,
      });
      if (isSelf) await wipeLocalDatabase({ resumeSync: true });
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

  const selected = users.find((user) => user.id === userId);

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-base-300 p-4"
      data-test="admin-rebuild-action"
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">Rebuild event log</h3>
        <p className="text-sm text-base-content/70">
          Replaces a user's sync events with one insert per row currently in the tables. Their
          devices drop local data and pull the rebuilt log on next sync.
        </p>
      </div>

      <Select value={userId} onValueChange={setUserId}>
        <SelectTrigger className="w-full" data-test="admin-rebuild-user">
          <SelectValue placeholder="Choose a user" />
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name} ({user.email}) · {user.events} events
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
            <AlertDialogTitle>
              Rebuild {selected?.name ?? "this user"}'s event log?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All {selected?.events ?? 0} sync events are deleted and regenerated from the current
              table rows. History is lost.
              {isSelf ? " This tab will wipe its local copy and reload." : ""}
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
    </section>
  );
}
