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
import { pruneLibraryFn } from "@/modules/admin/admin.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminActionCard } from "../../-components/AdminActionCard";
import { ALL_USERS, AdminUserSelect } from "../../-components/AdminUserSelect";

function describeCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([collectionId, n]) => `${n.toLocaleString()} ${collectionId}`)
    .join(" · ");
}

export function PruneLibraryAction() {
  const [userId, setUserId] = useState(ALL_USERS);
  const isAll = userId === ALL_USERS;

  const mutation = useMutation({
    mutationFn: async () => pruneLibraryFn({ data: { userId: isAll ? undefined : userId } }),
    onSuccess(result) {
      const pruned = describeCounts(result.pruned);
      const merged = describeCounts(result.merged);
      toast.success(pruned ? "Unused library rows deleted" : "Nothing unused to delete", {
        description: [
          pruned && `Deleted ${pruned}.`,
          merged && `Merged ${merged}.`,
          `${result.events.toLocaleString()} events written. Backup: ${result.backup}.`,
        ]
          .filter(Boolean)
          .join(" "),
        duration: 15_000,
      });
    },
    onError(err: unknown) {
      toast.error("Prune failed", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [["admin"]] },
  });

  return (
    <AdminActionCard
      title="Delete unused library rows"
      description="Merges duplicates, then deletes every experience, bullet, skill group, skill, summary, project… that no résumé uses, with the links that point at them. The event log is backed up first; deletes go out as normal events."
      danger
      data-test="admin-prune-action"
    >
      <AdminUserSelect value={userId} onChange={setUserId} allowAll data-test="admin-prune-user" />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="btn btn-error btn-sm self-start"
            disabled={!userId || mutation.isPending}
            data-test="admin-prune-open"
          >
            {mutation.isPending ? "Deleting…" : "Delete unused rows"}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete unused library rows for {isAll ? "every user" : "this user"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Rows that are not on any résumé disappear from the library on every device. Run
              “Rebuild event log” afterwards to shrink the log to the rows that are left.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate()} data-test="admin-prune-confirm">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminActionCard>
  );
}
