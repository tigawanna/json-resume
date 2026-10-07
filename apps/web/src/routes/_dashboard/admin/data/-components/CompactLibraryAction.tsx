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
      const merged = Object.entries(result.merged).filter(([, n]) => n > 0);
      toast.success(
        merged.length === 0
          ? "No duplicates found"
          : `Merged duplicates for ${result.users.toLocaleString()} users`,
        {
          description:
            merged.length > 0
              ? `${merged.map(([collectionId, n]) => `${n} ${collectionId}`).join(" · ")} · ${result.events.toLocaleString()} events written`
              : undefined,
        },
      );
    },
    onError(err: unknown) {
      toast.error("Merge failed", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [["admin"]] },
  });

  return (
    <AdminActionCard
      title="Merge duplicate library rows"
      description="Keeps one experience, project, skill, bullet… per natural key and repoints every résumé link at it. Changes go out as normal events, so devices pick them up on their next sync."
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
