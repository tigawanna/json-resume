import { adminStatsQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { projectPendingEventsFn } from "@/modules/admin/admin.functions";
import { unwrapUnknownError } from "@/utils/errors";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminActionCard } from "../../-components/AdminActionCard";

export function ProjectionAction() {
  const stats = useQuery(adminStatsQueryOptions);
  const pending = stats.data?.unprojectedEvents ?? 0;

  const mutation = useMutation({
    mutationFn: async () => projectPendingEventsFn(),
    onSuccess(result) {
      toast.success(`Applied ${result.projected.toLocaleString()} events to the tables`);
    },
    onError(err: unknown) {
      toast.error("Projection failed", { description: unwrapUnknownError(err).message });
    },
    meta: { invalidates: [["admin"]] },
  });

  return (
    <AdminActionCard
      title="Catch up projection"
      description="Applies events that are in the log but not in the tables yet. The nightly cron does this too; squash, merge and rebuild run it first."
      data-test="admin-projection-action"
    >
      <p className="text-sm" data-test="admin-projection-pending">
        {stats.data
          ? `${pending.toLocaleString()} events waiting · last applied seq ${stats.data.lastProjectedSeq?.toLocaleString() ?? "none"}`
          : "Counting…"}
      </p>
      <button
        type="button"
        className="btn btn-outline btn-sm self-start"
        disabled={pending === 0 || mutation.isPending}
        onClick={() => mutation.mutate()}
        data-test="admin-projection-run"
      >
        {mutation.isPending ? "Applying…" : "Apply now"}
      </button>
    </AdminActionCard>
  );
}
