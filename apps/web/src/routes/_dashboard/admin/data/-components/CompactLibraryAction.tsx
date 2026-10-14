import { compactLibraryFn } from "@/modules/admin/admin.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminActionCard } from "../../-components/AdminActionCard";
import { ALL_USERS, AdminUserSelect } from "../../-components/AdminUserSelect";

export function CompactLibraryAction() {
  const [userId, setUserId] = useState(ALL_USERS);

  const mutation = useMutation({
    mutationFn: async () =>
      compactLibraryFn({ data: { userId: userId === ALL_USERS ? undefined : userId } }),
    onSuccess(result) {
      toast.success(`Merge requested for ${result.users.toLocaleString()} users`, {
        description: "The next device each user syncs plans the merge and uploads it.",
      });
    },
    onError(err: unknown) {
      toast.error("Merge failed", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [["admin"]] },
  });

  return (
    <AdminActionCard
      title="Merge duplicate library rows"
      description="Asks each user's devices to keep one experience, project, skill, bullet… per natural key and repoint every résumé link at it. The first device to sync plans it; every other device replays the result."
      data-test="admin-compact-action"
    >
      <AdminUserSelect
        value={userId}
        onChange={setUserId}
        allowAll
        data-test="admin-compact-user"
      />
      <button
        type="button"
        className="btn btn-outline btn-sm self-start"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
        data-test="admin-compact-run"
      >
        {mutation.isPending ? "Merging…" : "Merge duplicates"}
      </button>
    </AdminActionCard>
  );
}
